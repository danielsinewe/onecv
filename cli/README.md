# 1CV CLI

Keep one freelancer profile on your machine and reuse it across marketplaces.

From this repository:

```bash
cd cli
npm install
npm test
npm link

1cv init
1cv plan 9am
1cv search 9am
1cv plan bizforward
1cv apply bizforward
1cv status bizforward
```

During the public beta, start without cloning the repository:

```bash
npx @danielsinewe/1cv start https://www.linkedin.com/in/your-profile
npx @danielsinewe/1cv init
npx @danielsinewe/1cv --help
npx @danielsinewe/1cv platforms
# Continue only with an adapter and command listed by this executable.
npx @danielsinewe/1cv plan bizforward
npx @danielsinewe/1cv apply bizforward
npx @danielsinewe/1cv status bizforward
```

Or install it globally with `npm install -g @danielsinewe/1cv`.

The published npm beta currently supports BizForward. This source also includes
9am search preparation, which is pending npm release. A Codex plugin update does
not upgrade an installed CLI. Check `--help` and `platforms` with the same
executable before marketplace work; do not run source-only commands against a
published CLI that does not list them.

`start` installs or updates the 1CV plugin and opens a new Codex desktop task in `~/.1cv` with the LinkedIn request prefilled. Browser work continues in Codex's in-app browser.

`init` guides a new user through the minimum profile fields and writes them to the local profile file. No repository checkout or manual JSON editing is required.

`edit` updates the local profile interactively or with flags. `diff <platform>` shows field changes since the last verified preparation. `status <platform>` distinguishes prepared forms from confirmed submissions.

`search 9am` opens 9am's job board, waits for sign-in when needed, and applies the local skills, remote/location, languages, and EUR hourly-rate preferences. Daily and non-EUR rates leave the rate filter unchanged and show a warning; no unit or currency conversion is performed. Preparation is recorded only after the search verification succeeds. It never applies to a job. Sign in once in the dedicated browser and later runs reuse that session automatically.

`apply` opens Chrome, keeps only necessary cookies, fills the form, and stops for review. Submission is explicit: `1cv apply bizforward --consent --submit`.

Data lives in `~/.1cv/profile.json` by default. Local preparation state lives in `~/.1cv/platforms/` and is written only after a verified fill or confirmed submission. Change the location with `ONECV_HOME` or `--profile`. 1CV stores no marketplace passwords, includes no telemetry, and uses a dedicated persistent Chrome profile at `~/.1cv/browser-profile`. To reuse a browser you already started with remote debugging, pass `--cdp-url http://127.0.0.1:9222`.
