import { createLaunchTracker } from "./launch-events.js";

const measurementId = "G-JCEGJ83QQN";
const consentStorageKey = "onecv_google_analytics_consent";
const validChoices = new Set(["granted", "denied"]);
let currentConsent = null;

export const trackLaunchEvent = createLaunchTracker({
  getConsent: () => currentConsent,
  emit: (name, parameters) => window.gtag("event", name, parameters),
  location: window.location,
  navigator: window.navigator,
});

window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag() {
  window.dataLayer.push(arguments);
};

window.gtag("consent", "default", {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  wait_for_update: 500,
});

function storedConsent() {
  try {
    const value = window.localStorage.getItem(consentStorageKey);
    return validChoices.has(value) ? value : null;
  } catch {
    return null;
  }
}

function updateConsent(choice) {
  currentConsent = choice;
  window.gtag("consent", "update", {
    analytics_storage: choice,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  try {
    window.localStorage.setItem(consentStorageKey, choice);
  } catch {
    // Consent still applies for this page when storage is unavailable.
  }
}

const initialConsent = storedConsent();
if (initialConsent) updateConsent(initialConsent);

const tag = document.createElement("script");
tag.async = true;
tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
document.head.append(tag);

window.gtag("js", new Date());
window.gtag("config", measurementId);

function addConsentControls() {
  document.querySelector(".setup-preview video")?.addEventListener("ended", () => {
    trackLaunchEvent("onecv_setup_preview_completed");
  });
  const settingsHost = document.querySelector("header.shell.nav");
  if (settingsHost && !settingsHost.querySelector("[data-analytics-settings]")) {
    const settingsButton = document.createElement("button");
    settingsButton.className = "nav-link footer-consent-button";
    settingsButton.type = "button";
    settingsButton.dataset.analyticsSettings = "";
    settingsButton.textContent = "Cookie settings";
    settingsHost.append(settingsButton);
  }

  const banner = document.createElement("section");
  banner.className = "analytics-consent";
  banner.dataset.analyticsConsent = "";
  banner.setAttribute("aria-label", "Analytics consent");
  banner.setAttribute("aria-modal", "true");
  banner.setAttribute("role", "dialog");
  banner.innerHTML = `
    <div>
      <strong>Optional analytics</strong>
      <p>Allow anonymous Google Analytics to help improve 1CV. Advertising stays off.</p>
      <a href="/cookie-policy/">Cookie policy</a>
    </div>
    <div class="analytics-consent-actions">
      <button type="button" data-consent-choice="denied">Reject</button>
      <button class="analytics-consent-allow" type="button" data-consent-choice="granted">Allow</button>
    </div>`;
  document.body.append(banner);

  const openBanner = () => { banner.hidden = false; };
  const closeBanner = () => { banner.hidden = true; };

  document.querySelectorAll("[data-analytics-settings]").forEach((button) => {
    button.addEventListener("click", openBanner);
  });

  banner.querySelectorAll("[data-consent-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      updateConsent(button.dataset.consentChoice);
      closeBanner();
    });
  });

  if (initialConsent) closeBanner();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addConsentControls, { once: true });
} else {
  addConsentControls();
}
