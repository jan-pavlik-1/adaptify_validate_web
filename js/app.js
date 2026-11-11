/**
 * Adaptify — app.js
 *
 * Funkce:
 *  1. Přepínač velikosti textu (WCAG 1.4.4) s persistencí v localStorage
 *  2. Asynchronní odeslání formuláře přes Formspree
 *  3. Validace e-mailu + ARIA stavové zprávy (WCAG 3.3.1, 4.1.3)
 *  4. GA4 event tracking při úspěšné registraci
 */
document.addEventListener('DOMContentLoaded', () => {

  /* ═══════════════════════════════════════════════════
     1. PŘEPÍNAČ VELIKOSTI TEXTU
        WCAG 1.4.4: text musí být zvětšitelný na 200 %
        bez ztráty obsahu nebo funkcionality.
        Preferenci ukládáme do localStorage.
     ═══════════════════════════════════════════════════ */
  const toggleBtn  = document.getElementById('textSizeToggle');
  const toggleText = document.getElementById('toggleText');
  const html       = document.documentElement;
  const LS_KEY     = 'adaptify-text-large';

  let isLarge = false;

  /**
   * Aplikuje (nebo odstraní) třídu pro zvětšený text
   * a aktualizuje ARIA atributy tlačítka.
   * @param {boolean} large
   */
  function applyTextSize(large) {
    isLarge = large;
    html.classList.toggle('text-large', large);

    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', String(large));
      toggleBtn.setAttribute('aria-label',
        large ? 'Zmenšit velikost textu' : 'Zvětšit velikost textu');
    }

    if (toggleText) {
      toggleText.textContent = large ? 'Zmenšit text' : 'Zvětšit text';
    }

    try {
      large
        ? localStorage.setItem(LS_KEY, '1')
        : localStorage.removeItem(LS_KEY);
    } catch { /* soukromý prohlížeč bez localStorage */ }
  }

  // Obnov uložené nastavení při načtení stránky
  try {
    if (localStorage.getItem(LS_KEY)) applyTextSize(true);
  } catch { /* noop */ }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => applyTextSize(!isLarge));
  }


  /* ═══════════════════════════════════════════════════
     2. ODESLÁNÍ FORMULÁŘE (Formspree, async)
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
      clearStatus(statusEl);

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
      }
    });
  }


  /* ── Pomocné funkce ───────────────────────────────── */

  /**
   * Zobrazí stavovou zprávu do aria-live regionu.
   * Použití textContent (nikoli innerHTML) pro bezpečnost.
   * @param {HTMLElement} el
   * @param {'success'|'error'} type
   * @param {string} msg
   */
  function showStatus(el, type, msg) {
    el.className   = `form-status form-status--${type}`;
    el.textContent = msg;
    // aria-live="polite" automaticky přečte změnu obsahu
  }

  /**
   * Vymaže stavovou zprávu (vizuálně skryta přes CSS :empty).
   * @param {HTMLElement} el
   */
  function clearStatus(el) {
    el.className   = 'form-status';
    el.textContent = '';
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
  initForm('cta-form',  'cta-status');

});
