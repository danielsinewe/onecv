import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader";
import "./styles.css";
import { trackLaunchEvent } from "./analytics.js";

const form = document.querySelector("[data-start-form]");
const input = document.querySelector("[data-linkedin-input]");
const output = document.querySelector("[data-command-output]");
const result = document.querySelector("[data-start-result]");
const copyButton = document.querySelector("[data-copy-command]");
const error = document.querySelector("[data-form-error]");
const copyStatus = document.querySelector("[data-copy-status]");
let commandVersion = 0;
let copyTimer;

function resetCopyState() {
  commandVersion += 1;
  window.clearTimeout(copyTimer);
  copyButton.disabled = false;
  copyButton.textContent = "Copy setup command";
  copyStatus.textContent = "";
}

function selectCommand() {
  const selection = window.getSelection();
  if (!selection) return false;
  const range = document.createRange();
  range.selectNodeContents(output);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function normalizeLinkedIn(value) {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const match = url.pathname.match(/^\/in\/([a-z0-9_-]+)\/?$/i);
  if (hostname !== "linkedin.com" || !match) return null;
  return `https://www.linkedin.com/in/${match[1]}`;
}

async function copyCommand() {
  const command = output?.textContent || "";
  if (!command || result.hidden || copyButton.disabled) return;
  const version = commandVersion;
  copyButton.disabled = true;
  copyStatus.textContent = "";
  let copied = false;
  try {
    await navigator.clipboard.writeText(command);
    copied = true;
  } catch {
    if (version !== commandVersion) return;
    try {
      copied = selectCommand() && document.execCommand("copy");
      if (copied) window.getSelection()?.removeAllRanges();
    } catch {
      copied = false;
    }
  }
  if (version !== commandVersion) return;
  copyButton.disabled = false;
  if (!copied) {
    output.focus({ preventScroll: true });
    copyStatus.textContent = "Copy didn’t work. Select the command and copy it manually, or try again.";
    return;
  }
  copyStatus.textContent = "Copied — paste in Terminal.";
  trackLaunchEvent("onecv_command_copied");
  copyButton.textContent = "Copied — paste in Terminal";
  copyTimer = window.setTimeout(() => {
    if (version === commandVersion) copyButton.textContent = "Copy setup command";
  }, 2600);
}

input?.addEventListener("input", () => {
  resetCopyState();
  output.textContent = "";
  result.hidden = true;
  error.textContent = "";
  input.removeAttribute("aria-invalid");
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  resetCopyState();
  output.textContent = "";
  const linkedin = normalizeLinkedIn(input.value.trim());
  if (!linkedin) {
    error.textContent = "Use a LinkedIn profile URL like linkedin.com/in/your-name.";
    input.setAttribute("aria-invalid", "true");
    result.hidden = true;
    return;
  }
  error.textContent = "";
  input.removeAttribute("aria-invalid");
  output.textContent = `npx --yes @danielsinewe/1cv start ${linkedin}`;
  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  copyButton.focus({ preventScroll: true });
  trackLaunchEvent("onecv_command_generated");
});

copyButton?.addEventListener("click", copyCommand);
