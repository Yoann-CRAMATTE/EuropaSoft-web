/* ==========================================================================
   EuropaSoft — injection des informations d’identité
   --------------------------------------------------------------------------
   Convention du projet : nom, version, contact, copyright… se lisent dans
   AppInfo.json et ne sont jamais codés en dur ailleurs. Le HTML contient une
   valeur de repli (identique à AppInfo.json au moment de l’écriture) pour que
   la page reste correcte sans JavaScript ou ouverte en file:// (où fetch est
   refusé) ; ce script la remplace par la valeur à jour.

   Attributs reconnus :
     data-appinfo="clé"         → remplace le texte de l’élément
                                  (clé « contact » sur un <a> : met aussi à
                                  jour href="mailto:…")
     data-appinfo-href="contact" → href="mailto:<contact>" sans toucher au texte
     data-appinfo-action="contact" → action="mailto:<contact>" (formulaire)
   Clés disponibles : name, version, company, developer, website, contact,
   copyright, description.
   ========================================================================== */
(function () {
  'use strict';

  // Chemin résolu depuis l’emplacement du script : fonctionne aussi depuis
  // la page 404, servie sous n’importe quelle URL.
  var script = document.currentScript;
  var url = script ? new URL('../AppInfo.json', script.src).href : 'AppInfo.json';

  function apply(info) {
    document.querySelectorAll('[data-appinfo]').forEach(function (el) {
      var key = el.getAttribute('data-appinfo');
      var value = info[key];
      if (typeof value !== 'string' || !value) return;
      el.textContent = value;
      if (key === 'contact' && el.tagName === 'A') el.href = 'mailto:' + value;
      if (key === 'website' && el.tagName === 'A') el.href = value;
    });

    if (info.contact) {
      document.querySelectorAll('[data-appinfo-href="contact"]').forEach(function (el) {
        el.href = 'mailto:' + info.contact;
      });
      document.querySelectorAll('[data-appinfo-action="contact"]').forEach(function (el) {
        el.setAttribute('action', 'mailto:' + info.contact);
      });
    }

    document.dispatchEvent(new CustomEvent('appinfo:ready', { detail: info }));
  }

  if (!window.fetch) return;

  fetch(url, { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('AppInfo.json : HTTP ' + res.status);
      return res.json();
    })
    .then(apply)
    .catch(function () {
      // Échec silencieux : les valeurs de repli du HTML restent affichées.
    });
})();
