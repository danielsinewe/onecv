# 1CV

One local profile for every freelance marketplace.

1CV keeps the canonical freelancer profile on the user's machine, maps it to each platform, and fills forms in a user-owned browser. Routine steps such as necessary-cookie prompts are automated. Login, MFA, CAPTCHA, consent, and final review remain with the user.

Supabase provides optional authenticated backup, revision history, platform state, and sync audit records. The local profile remains usable without an account or network connection. Credentials and browser sessions are never uploaded.

## MVP

- [`cli/`](cli/) — independently publishable `1cv` npm package with the `1cv` command
- [`plugins/1cv/`](plugins/1cv/) — Codex plugin and portable Agent Skill
- 9am adapter — profile-driven skills, location, remote, language, and hourly-rate job filters
- BizForward adapter — name, email, specialty, public profile, optional CV, explicit consent
- [`supabase/migrations/`](supabase/migrations/) — RLS-protected cloud sync schema; every table uses the `onecv_` prefix

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

The default action fills and pauses. Only `1cv apply bizforward --consent --submit` submits.

During the public beta, a new user starts with no repository checkout:

```bash
npx @danielsinewe/1cv start https://www.linkedin.com/in/your-profile
npx @danielsinewe/1cv init
npx @danielsinewe/1cv plan 9am
npx @danielsinewe/1cv search 9am
npx @danielsinewe/1cv plan bizforward
npx @danielsinewe/1cv apply bizforward
npx @danielsinewe/1cv status bizforward
```

Install the Codex plugin from the public repository:

```bash
codex plugin marketplace add danielsinewe/onecv
codex plugin add 1cv@1cv
```

The command installs or updates the plugin, then opens a new Codex desktop task in `~/.1cv` with the request prefilled. Browser work continues in Codex's in-app browser. The public onboarding site lives in [`web/`](web/); it validates LinkedIn profile URLs locally and does not submit the URL to a server.

Use `1cv edit` to update the local profile without editing JSON. `1cv search 9am` signs in once, then keeps using the dedicated 1CV browser to prepare matching filters; it never applies to a job. After a verified fill, `1cv status <platform>` and `1cv diff <platform>` show what was prepared and what changed. This history stays beside the profile in `~/.1cv/platforms/`.

## Adapter contract

Every marketplace integration must support a preview plan, use the local profile, run through a user-owned browser context, and verify the visible result. Adapters must not store credentials or bypass platform security.

9am search preparation and BizForward intake are supported. Job applications, login, MFA, CAPTCHA, legal consent, and final submission remain explicit user actions.
