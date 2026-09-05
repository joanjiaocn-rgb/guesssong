(() => {
  const measurementId = "G-BQGNNYLR8H";
  const consentKey = "noteguess-analytics-consent";
  if (!window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", wait_for_update: 500 });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { allow_google_signals: false, allow_ad_personalization_signals: false, send_page_view: false });
    const tag = document.createElement("script");
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(tag);
  }
  const hasConsent = () => localStorage.getItem(consentKey) === "granted";
  const gtag = (...args) => window.gtag?.(...args);

  function sendPageView() {
    gtag("config", measurementId, {
      page_path: window.location.pathname,
      page_title: document.title,
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }

  function grantConsent() {
    localStorage.setItem(consentKey, "granted");
    gtag("consent", "update", { analytics_storage: "granted" });
    sendPageView();
    gtag("event", "analytics_consent_granted");
  }

  function denyConsent() {
    localStorage.setItem(consentKey, "denied");
    gtag("consent", "update", { analytics_storage: "denied" });
  }

  function mountConsentPanel() {
    if (localStorage.getItem(consentKey)) return;
    const panel = document.createElement("aside");
    panel.className = "analytics-consent";
    panel.setAttribute("aria-label", "Analytics privacy choices");
    panel.innerHTML = `<div><strong>Help improve NoteGuess</strong><p>With your permission, we use Google Analytics to measure game use. It does not receive your answers or locally stored streak.</p><a href="/privacy" title="Read the NoteGuess privacy policy">Privacy policy</a></div><div class="analytics-consent-actions"><button type="button" class="analytics-deny">No thanks</button><button type="button" class="analytics-accept">Allow analytics</button></div>`;
    panel.querySelector(".analytics-accept").addEventListener("click", () => { grantConsent(); panel.remove(); });
    panel.querySelector(".analytics-deny").addEventListener("click", () => { denyConsent(); panel.remove(); });
    document.body.append(panel);
  }

  window.NoteGuessAnalytics = {
    track(eventName, parameters = {}) {
      if (hasConsent()) gtag("event", eventName, parameters);
    },
    resetConsent() {
      localStorage.removeItem(consentKey);
      gtag("consent", "update", { analytics_storage: "denied" });
      mountConsentPanel();
    },
  };

  if (hasConsent()) sendPageView();
  mountConsentPanel();
  document.getElementById("analytics-privacy-control")?.addEventListener("click", () => window.NoteGuessAnalytics.resetConsent());
})();
