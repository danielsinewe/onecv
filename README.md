# 1CV

One local profile for every freelance marketplace.

1CV keeps the canonical freelancer profile on the user's machine, maps it to each platform, and fills forms in the user's own Chrome session. Login, MFA, CAPTCHA, Cloudflare checks, consent, and final review remain with the user.

Supabase provides optional authenticated backup, revision history, platform state, and sync audit records. The local profile remains usable without an account or network connection. Credentials and browser sessions are never uploaded.

## MVP

- [`cli/`](cli/) — independently publishable `1cv` npm package with the `1cv` command
- [`plugins/1cv/`](plugins/1cv/) — Codex plugin and portable Agent Skill
- BizForward adapter — name, email, specialty, public profile, optional CV, explicit consent
- [`supabase/migrations/`](supabase/migrations/) — RLS-protected cloud sync schema; every table uses the `onecv_` prefix

```bash
cd cli
npm install
npm test
npm link

1cv init
1cv plan bizforward
1cv apply bizforward
```

The default action fills and pauses. Only `1cv apply bizforward --consent --submit` submits.

During the public beta, a new user starts with no repository checkout:

```bash
npx @danielsinewe/1cv start https://www.linkedin.com/in/your-profile
npx @danielsinewe/1cv init
npx @danielsinewe/1cv plan bizforward
npx @danielsinewe/1cv apply bizforward
```

Install the Codex plugin from the public repository:

```bash
codex plugin marketplace add danielsinewe/onecv
codex plugin add 1cv@1cv
```

The command installs or updates the plugin, then opens a new Codex desktop task in `~/.1cv` with the request prefilled. This keeps the Chrome connection in the same desktop environment as the task. The public onboarding site lives in [`web/`](web/); it validates LinkedIn profile URLs locally and does not submit the URL to a server.

## Adapter contract

Every marketplace integration must support a preview plan, use the local profile, run through a user-owned browser context, and verify the visible result. Adapters must not store credentials or bypass platform security.

Next adapters should target the marketplaces users actually maintain most often—Malt, freelancermap, and Freelancer.com—after inspecting their current signed-in profile forms.
