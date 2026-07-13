# 1CV CLI

Keep one freelancer profile on your machine and reuse it across marketplaces.

From this repository:

```bash
cd cli
npm install
npm test
npm link

1cv init
1cv plan bizforward
1cv apply bizforward
```

During the public beta, start without cloning the repository:

```bash
npx @danielsinewe/1cv start https://www.linkedin.com/in/your-profile
npx @danielsinewe/1cv init
npx @danielsinewe/1cv plan bizforward
npx @danielsinewe/1cv apply bizforward
```

Or install it globally with `npm install -g @danielsinewe/1cv`.

`start` installs or updates the 1CV plugin and opens a new Codex desktop task in `~/.1cv` with the LinkedIn request prefilled. Browser work continues in Codex's in-app browser.

`init` guides a new user through the minimum profile fields and writes them to the local profile file. No repository checkout or manual JSON editing is required.

`apply` opens Chrome, keeps only necessary cookies, fills the form, and stops for review. Submission is explicit: `1cv apply bizforward --consent --submit`.

Data lives in `~/.1cv/profile.json` by default. Change the location with `ONECV_HOME` or `--profile`. 1CV stores no marketplace passwords, includes no telemetry, and uses a dedicated persistent Chrome profile at `~/.1cv/browser-profile`. To reuse a browser you already started with remote debugging, pass `--cdp-url http://127.0.0.1:9222`.
