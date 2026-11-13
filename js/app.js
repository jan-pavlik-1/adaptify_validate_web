/**
 * Adaptify — app.js
 *
 * Funkce:
 *  1. Asynchronní odeslání formulářů přes Formspree
 *  2. Validace e-mailu + ARIA stavové zprávy (WCAG 3.3.1, 4.1.3)
 *  3. GA4 event tracking při úspěšné registraci
 */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Accessibility mode ──────────────────────────── */
  const a11yToggle = document.getElementById('a11y-toggle');
  const a11yKey = 'a11y_mode';

  function setAccessibilityMode(enabled) {
    document.documentElement.classList.toggle('accessible-mode', enabled);
    if (a11yToggle) {
      a11yToggle.setAttribute('aria-pressed', String(enabled));
    }

    try {
      localStorage.setItem(a11yKey, String(enabled));
    } catch {
      // Režim zůstává aktivní pro aktuální návštěvu, i když úložiště není dostupné.
    }
  }

  let a11yEnabled = false;
  try {
    a11yEnabled = localStorage.getItem(a11yKey) === 'true';
  } catch {
    // Při nedostupném úložišti se použije běžný režim.
  }

  document.documentElement.classList.toggle('accessible-mode', a11yEnabled);
  if (a11yToggle) {
    a11yToggle.setAttribute('aria-pressed', String(a11yEnabled));
    a11yToggle.addEventListener('click', () => {
      a11yEnabled = !a11yEnabled;
      setAccessibilityMode(a11yEnabled);
    });
  }

  /* ═══════════════════════════════════════════════════
     ODESLÁNÍ FORMULÁŘE (Formspree, async)
        WCAG 3.3.1: chyba je identifikována a popsána
        WCAG 4.1.3: stavová zpráva přes aria-live region
     ═══════════════════════════════════════════════════ */

  /**
   * Inicializuje formulář: validace + async submit.
   * @param {string} formId     - id atribut formuláře
   * @param {string} statusId   - id aria-live elementu pro zprávy
   */
  function initForm(formId, statusId) {
    const form     = document.getElementById(formId);
    const statusEl = document.getElementById(statusId);
    if (!form || !statusEl) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector('input[type="email"]');
      const submitBtn  = form.querySelector('button[type="submit"]');

      /* -- Validace e-mailu -- */
      const emailValue = (emailInput?.value ?? '').trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

      if (!emailValue || !emailRegex.test(emailValue)) {
        // WCAG 3.3.1: pole označeno jako neplatné + chybová zpráva
        emailInput?.setAttribute('aria-invalid', 'true');
        showStatus(statusEl, 'error', 'Zadej prosím platnou e-mailovou adresu.');
        emailInput?.focus();
        return;
      }

      // Platný vstup — odstraň příznak chyby
      emailInput?.removeAttribute('aria-invalid');

      /* -- Loading stav -- */
      setLoading(submitBtn, true);
      form.setAttribute('aria-busy', 'true');
      showStatus(statusEl, 'loading', 'Odesílám…');

      /* -- Odeslání na Formspree -- */
      try {
        const response = await fetch(form.action, {
          method:  'POST',
          body:    new FormData(form),
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // Úspěch
        form.reset();
        showStatus(statusEl, 'success',
          'Hotovo! Hned po spuštění tě upozorníme.');

        // GA4 event — sledování konverzí
        if (typeof gtag !== 'undefined') {
          gtag('event', 'sign_up', {
            method:  'email',
            form_id: formId,
          });
        }

      } catch {
        showStatus(statusEl, 'error',
          'Něco se pokazilo. Zkus to prosím znovu za chvíli.');
      } finally {
        setLoading(submitBtn, false);
        form.removeAttribute('aria-busy');
      }
    });
  }


  /* ── Pomocné funkce ───────────────────────────────── */

  /**
   * Zobrazí stavovou zprávu do aria-live regionu.
   * Použití textContent (nikoli innerHTML) pro bezpečnost.
   * @param {HTMLElement} el
   * @param {'loading'|'success'|'error'} type
   * @param {string} msg
   */
  function showStatus(el, type, msg) {
    el.hidden      = false;
    el.className   = `form-status form-status--${type}`;
    el.textContent = msg;
    // aria-live="polite" automaticky přečte změnu obsahu
  }

  /**
   * Přepne loading stav tlačítka.
   * Třída is-loading přepíná .btn-label / .btn-spinner přes CSS.
   * @param {HTMLElement|null} btn
   * @param {boolean} loading
   */
  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle('is-loading', loading);
  }


  /* -- Inicializace obou formulářů -- */
  initForm('hero-form', 'hero-status');
  initForm('cta-form', 'cta-status');

});
