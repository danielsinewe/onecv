import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader";
import "./styles.css";

const form = document.querySelector("[data-start-form]");
const input = document.querySelector("[data-linkedin-input]");
const output = document.querySelector("[data-command-output]");
const result = document.querySelector("[data-start-result]");
const copyButton = document.querySelector("[data-copy-command]");
const error = document.querySelector("[data-form-error]");

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
  if (!command) return;
  try {
    await navigator.clipboard.writeText(command);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(output);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
  }
  copyButton.textContent = "Copied — paste in Terminal";
  window.setTimeout(() => { copyButton.textContent = "Copy setup command"; }, 2600);
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
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
});

copyButton?.addEventListener("click", copyCommand);
