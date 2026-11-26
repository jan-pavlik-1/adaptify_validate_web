/**
 * Adaptify — app.js
 *
 * Funkce:
 *  1. Přepínání režimu přístupnosti (Zvětšit text a kontrast)
 *  2. Asynchronní odeslání formulářů (registrace + odhlášení GDPR)
 *  3. Pop-up potvrzení registrace a Cookie lišta
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
      // Ignorovat chybu úložiště
    }
  }

  let a11yEnabled = false;
  try {
    a11yEnabled = localStorage.getItem(a11yKey) === 'true';
  } catch {
    // Ignorovat chybu úložiště
  }

  document.documentElement.classList.toggle('accessible-mode', a11yEnabled);
  if (a11yToggle) {
    a11yToggle.setAttribute('aria-pressed', String(a11yEnabled));
    a11yToggle.addEventListener('click', () => {
      a11yEnabled = !a11yEnabled;
      setAccessibilityMode(a11yEnabled);
    });
  }

  /* ── Pop-up okno po registraci ───────────────────── */
  const signupModal      = document.getElementById('signup-modal');
  const closeSignupBtn   = document.getElementById('close-signup-modal');
  const confirmSignupBtn = document.getElementById('confirm-signup-modal');
  let lastSignupTrigger  = null;

  function openSignupModal() {
    if (!signupModal) return;
    lastSignupTrigger = document.activeElement;
    signupModal.hidden = false;
    confirmSignupBtn?.focus();
  }

  function closeSignupModal() {
    if (!signupModal) return;
    signupModal.hidden = true;
    if (lastSignupTrigger && typeof lastSignupTrigger.focus === 'function') {
      lastSignupTrigger.focus();
    }
  }

  closeSignupBtn?.addEventListener('click', closeSignupModal);
  confirmSignupBtn?.addEventListener('click', closeSignupModal);

  signupModal?.addEventListener('click', (e) => {
    if (e.target === signupModal) closeSignupModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && signupModal && !signupModal.hidden) {
      closeSignupModal();
    }
  });

  /* ═══════════════════════════════════════════════════
     ODESLÁNÍ FORMULÁŘŮ (Formspree, async)
     ═══════════════════════════════════════════════════ */
  function initForm(formId, statusId) {
    const form     = document.getElementById(formId);
    const statusEl = document.getElementById(statusId);
    if (!form || !statusEl) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector('input[type="email"]');
      const submitBtn  = form.querySelector('button[type="submit"]');

      const emailValue = (emailInput?.value ?? '').trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

      if (!emailValue || !emailRegex.test(emailValue)) {
        emailInput?.setAttribute('aria-invalid', 'true');
        showStatus(statusEl, 'error', 'Zadej prosím platnou e-mailovou adresu.');
        emailInput?.focus();
        return;
      }

      emailInput?.removeAttribute('aria-invalid');

      setLoading(submitBtn, true);
      form.setAttribute('aria-busy', 'true');
      showStatus(statusEl, 'loading', 'Odesílám…');

      try {
        const response = await fetch(form.action, {
          method:  'POST',
          body:    new FormData(form),
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        form.reset();

        if (formId === 'unsubscribe-form') {
          showStatus(statusEl, 'success',
            'Odhlášeno. Žádost o vymazání jsme přijali k vyřízení.');
        } else {
          showStatus(statusEl, 'success',
            'Díky, moc se těšíme! Hned po spuštění ti pošleme e-mail.');
          openSignupModal();

          if (typeof gtag !== 'undefined') {
            gtag('event', 'sign_up', {
              method:  'email',
              form_id: formId,
            });
          }
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

  function showStatus(el, type, msg) {
    el.hidden      = false;
    el.className   = `form-status form-status--${type}`;
    el.textContent = msg;
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle('is-loading', loading);
  }

  initForm('hero-form', 'hero-status');
  initForm('cta-form', 'cta-status');
  initForm('unsubscribe-form', 'unsub-status');

  /* ═══════════════════════════════════════════════════
     COOKIE LIŠTA
     ═══════════════════════════════════════════════════ */
  const cookieKey       = 'adaptify_cookie_consent';
  const cookieBanner    = document.getElementById('cookie-banner');
  const cookieAcceptBtn = document.getElementById('cookie-accept-btn');
  const cookieNecBtn    = document.getElementById('cookie-necessary-btn');
  const resetCookiesBtn = document.getElementById('reset-cookies-btn');

  let savedConsent = null;
  try {
    savedConsent = localStorage.getItem(cookieKey);
  } catch {
    // Ignorovat chybu úložiště
  }

  if (!savedConsent && cookieBanner) {
    cookieBanner.hidden = false;
  }

  function saveCookieConsent(level) {
    try {
      localStorage.setItem(cookieKey, level);
    } catch {
      // Ignorovat chybu úložiště
    }
    if (cookieBanner) cookieBanner.hidden = true;
  }

  cookieAcceptBtn?.addEventListener('click', () => saveCookieConsent('all'));
  cookieNecBtn?.addEventListener('click', () => saveCookieConsent('necessary'));

  resetCookiesBtn?.addEventListener('click', () => {
    try {
      localStorage.removeItem(cookieKey);
    } catch {
      // Ignorovat chybu úložiště
    }
    if (cookieBanner) cookieBanner.hidden = false;
  });

});