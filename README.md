# 1CV

One local profile for every freelance marketplace.

1CV keeps the canonical freelancer profile on the user's machine, maps it to each platform, and fills forms in the user's own Chrome session. Login, MFA, CAPTCHA, Cloudflare checks, consent, and final review remain with the user.

## MVP

- [`cli/`](cli/) — independently publishable `1cv` npm package with the `1cv` command
- [`plugins/1cv/`](plugins/1cv/) — Codex plugin and portable Agent Skill
- BizForward adapter — name, email, specialty, public profile, optional CV, explicit consent

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
npx 1cv@next init
npx 1cv@next plan bizforward
npx 1cv@next apply bizforward
```

Install the Codex plugin from the public repository:

```bash
codex plugin marketplace add danielsinewe/1cv
codex plugin add 1cv@1cv
```

## Adapter contract

Every marketplace integration must support a preview plan, use the local profile, run through a user-owned browser context, and verify the visible result. Adapters must not store credentials or bypass platform security.

Next adapters should target the marketplaces users actually maintain most often—Malt, freelancermap, and Freelancer.com—after inspecting their current signed-in profile forms.
