/* ==========================================================================
   EuropaSoft — comportements communs
   1. Menu mobile (bouton aria-expanded, fermeture Échap, clic extérieur)
   2. Apparitions sobres des sections (IntersectionObserver)
   3. Formulaire de contact : validation accessible et envoi
   Aucune dépendance, aucune requête vers un domaine tiers.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* 1. Menu mobile -------------------------------------------------------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var nav = toggle ? document.getElementById(toggle.getAttribute('aria-controls')) : null;

  if (toggle && nav) {
    var desktop = window.matchMedia('(min-width: 60rem)');

    var setOpen = function (open, returnFocus) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      if (open) nav.setAttribute('data-open', '');
      else nav.removeAttribute('data-open');
      if (!open && returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false, true);
      }
    });

    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });

    // Lien vers une ancre de la même page : refermer après le choix.
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    var onDesktop = function () { if (desktop.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);
  }

  /* 2. Apparitions -------------------------------------------------------
     Seuls les éléments sous la ligne de flottaison reçoivent .reveal :
     rien ne s’anime au chargement, la lecture n’est jamais retardée. */
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var targets = Array.prototype.filter.call(
      document.querySelectorAll('[data-reveal]'),
      function (el) { return el.getBoundingClientRect().top > window.innerHeight; }
    );
    if (targets.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      targets.forEach(function (el) {
        el.classList.add('reveal');
        io.observe(el);
      });
    }
  }

  /* 3. Formulaire de contact --------------------------------------------- */
  var form = document.querySelector('[data-contact-form]');
  if (!form) return;

  /* BRANCHEMENT D’UN SERVICE D’ENVOI (à choisir par Yoann) ----------------
     Renseigner ici l’URL qui reçoit le formulaire en POST (FormData) et
     répond 2xx en cas de succès : service de formulaires hébergé dans l’UE,
     fonction serveur de l’hébergeur, etc. Tant que la valeur est vide, le
     formulaire ouvre le logiciel de messagerie du visiteur (mailto:).
     Penser à mettre à jour la politique de confidentialité (destinataires).
  */
  var ENDPOINT = form.getAttribute('data-endpoint') || '';

  form.setAttribute('novalidate', '');

  var summary = form.querySelector('[data-form-summary]');
  var summaryList = summary ? summary.querySelector('ul') : null;
  var statusInfo = document.querySelector('[data-form-status="mailto"]');
  var statusOk = document.querySelector('[data-form-status="success"]');
  var statusKo = document.querySelector('[data-form-status="error"]');
  var submitBtn = form.querySelector('[type="submit"]');
  var submitLabel = submitBtn ? submitBtn.textContent : '';
  var attempted = false;

  var fields = Array.prototype.slice.call(form.querySelectorAll('[data-error]'));

  function errorFor(field) {
    var v = field.type === 'checkbox' ? field.checked : field.value.trim();
    if (field.type === 'checkbox') return v ? '' : field.getAttribute('data-error');
    if (field.required && !v) return field.getAttribute('data-error');
    if (field.type === 'email' && v && (field.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
      return field.getAttribute('data-error');
    }
    var min = parseInt(field.getAttribute('data-minlength') || '0', 10);
    if (min && v.length < min) return field.getAttribute('data-error');
    return '';
  }

  function show(field, message) {
    var box = document.getElementById(field.id + '-error');
    if (box) box.textContent = message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }

  function validate() {
    var errors = [];
    fields.forEach(function (field) {
      var message = errorFor(field);
      show(field, message);
      if (message) errors.push({ field: field, message: message });
    });
    return errors;
  }

  function hideStatuses() {
    [statusInfo, statusOk, statusKo].forEach(function (el) { if (el) el.hidden = true; });
  }

  // Correction en direct, seulement après une première tentative d’envoi.
  fields.forEach(function (field) {
    var evt = field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(evt, function () {
      if (attempted) show(field, errorFor(field));
    });
    field.addEventListener('blur', function () {
      if (attempted) show(field, errorFor(field));
    });
  });

  function label(field) {
    var l = form.querySelector('label[for="' + field.id + '"]');
    return l ? l.textContent.replace(/\s*\*\s*$/, '').trim() : field.name;
  }

  function buildMailto(data) {
    var to = (form.getAttribute('action') || '').replace(/^mailto:/i, '').split('?')[0];
    var subject = '[' + (data.get('objet') || 'Contact') + '] Message de ' + data.get('nom');
    var body =
      'Nom\u00a0: ' + data.get('nom') + '\n' +
      'Adresse e-mail\u00a0: ' + data.get('email') + '\n' +
      'Objet\u00a0: ' + data.get('objet') + '\n' +
      'Logiciel concerné\u00a0: ' + (data.get('logiciel') || 'Aucun en particulier') + '\n\n' +
      data.get('message');
    return 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function setSending(sending) {
    if (!submitBtn) return;
    submitBtn.disabled = sending;
    submitBtn.textContent = sending ? submitBtn.getAttribute('data-sending') : submitLabel;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    hideStatuses();

    var errors = validate();
    if (errors.length) {
      if (summary && summaryList) {
        summaryList.innerHTML = '';
        errors.forEach(function (err) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + err.field.id;
          a.textContent = label(err.field).replace(/\.$/, '') + '\u00a0: ' + err.message;
          a.addEventListener('click', function (ev) {
            ev.preventDefault();
            err.field.focus();
          });
          li.appendChild(a);
          summaryList.appendChild(li);
        });
        summary.hidden = false;
        summary.focus();
      } else {
        errors[0].field.focus();
      }
      return;
    }
    if (summary) summary.hidden = true;

    var data = new FormData(form);

    if (!ENDPOINT) {
      window.location.href = buildMailto(data);
      if (statusInfo) { statusInfo.hidden = false; statusInfo.focus(); }
      return;
    }

    setSending(true);
    fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        attempted = false;
        if (statusOk) { statusOk.hidden = false; statusOk.focus(); }
      })
      .catch(function () {
        // Le texte saisi n’est pas effacé.
        if (statusKo) { statusKo.hidden = false; statusKo.focus(); }
      })
      .then(function () { setSending(false); });
  });
})();
