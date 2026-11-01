export const publicSetupLink = "https://1cv.app/?utm_source=shared_walkthrough&utm_medium=referral&utm_campaign=launch_2026_11&utm_content=1cv_setup_share#setup-preview";

export function mountSetupShare({ document, navigator, trackLaunchEvent }) {
  const button = document.querySelector("[data-copy-setup-link]");
  if (!button) return;
  const status = document.querySelector("[data-setup-share-status]");
  const fallback = document.querySelector("[data-setup-share-fallback]");
  const input = document.querySelector("[data-public-setup-link]");
  input.value = publicSetupLink;

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    status.textContent = "";
    try {
      await navigator.clipboard.writeText(publicSetupLink);
      fallback.hidden = true;
      status.textContent = "Public setup link copied.";
      // A copy is a website action, not proof of a share or referral activation.
      trackLaunchEvent("onecv_setup_link_copied");
    } catch {
      fallback.hidden = false;
      status.textContent = "Copy didn’t work. Select the public link below and copy it manually, or try again.";
      input.focus();
      input.select();
    } finally {
      button.disabled = false;
    }
  });
}
