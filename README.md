# 1CV

One reviewed local profile for your freelance applications.

Bring your own LinkedIn profile into a reusable profile on your machine, preview the fields for BizForward, then prepare its intake form for review. 1CV is free, MIT-licensed software. You control login, consent and final submission.

[Start with the setup walkthrough](https://1cv.app/?utm_source=github&utm_medium=referral&utm_campaign=launch_2026_11&utm_content=beta6_quickstart) · [Watch the website setup demo](https://www.youtube.com/watch?v=fA1oNidjCjI)

## Public beta quickstart

You do not need to clone this repository. The currently published package is **0.1.0-beta.6**; the commands below select that same release throughout.

Before starting:

- Install **Node.js 20 or newer** and the **[Codex desktop app](https://openai.com/codex/get-started/)** for the LinkedIn handoff.
- Direct CLI form filling opens **Google Chrome** by default, using a dedicated 1CV browser profile. This is separate from the LinkedIn import inside Codex's in-app browser.
- The published beta supports **BizForward intake preparation**. The 9am search adapter in this repository is pending npm release.

Check the executable's commands and adapters:

```bash
npx @danielsinewe/1cv@0.1.0-beta.6 --help
npx @danielsinewe/1cv@0.1.0-beta.6 platforms
```

Replace the example URL with your own LinkedIn profile:

```bash
npx @danielsinewe/1cv@0.1.0-beta.6 start https://www.linkedin.com/in/your-profile
```

`start` installs or updates the Codex plugin and opens a new desktop task in `~/.1cv` with your request prefilled. **Review and send that request in Codex** to continue. Review the visible profile information before saving it; supply missing required details rather than guessing them. Login, MFA and CAPTCHA remain with you.

Once your local profile is saved, validate it and preview the supported intake:

```bash
npx @danielsinewe/1cv@0.1.0-beta.6 profile
npx @danielsinewe/1cv@0.1.0-beta.6 plan bizforward
```

To prepare the form in Chrome and stop for review:

```bash
npx @danielsinewe/1cv@0.1.0-beta.6 apply bizforward
npx @danielsinewe/1cv@0.1.0-beta.6 status bizforward
```

A prepared intake is not a submitted application or a completed BizForward expert-pool profile. The default `apply` action fills and pauses; only an explicit `--consent --submit` requests submission. Do not add those flags unless you intend to give that consent and submit.

Prefer to enter your profile yourself? Use `npx @danielsinewe/1cv@0.1.0-beta.6 init` for a new profile, or `edit` to update an existing one. Do not initialize over an existing profile. `diff bizforward` compares your current profile with the last verified preparation.

## Your data

The canonical profile is local at `~/.1cv/profile.json`. Verified preparation history lives in `~/.1cv/platforms/`; direct CLI browser sessions use `~/.1cv/browser-profile`. Change the profile location with `ONECV_HOME` or `--profile`. 1CV does not upload marketplace passwords or browser sessions.

The published CLI has no cloud-sync command. After installation, local profile editing and preview plans do not require an account or a network connection; LinkedIn import and live forms need their respective services. The repository's Supabase backup, revision and sync schema is separate from the published local workflow.

## Develop from source

Source capabilities can differ from the npm beta. Updating the Codex plugin does not upgrade an installed CLI. Always use the same executable for `--help`, `platforms` and the subsequent workflow; continue only when it lists the required command and adapter.

```bash
cd cli
npm install
npm test
npm link

1cv --help
1cv platforms
# Only continue with commands and adapters listed above.
1cv plan 9am
1cv search 9am
1cv plan bizforward
```

The source 9am adapter prepares job filters from local skills, location, remote, language and hourly-rate preferences. It does not apply to jobs. See the [CLI documentation](cli/README.md) for source-specific behavior.

The [Codex plugin and portable skill](plugins/1cv/) can also be installed separately:

```bash
codex plugin marketplace add danielsinewe/onecv
codex plugin add 1cv@1cv
```

The onboarding website lives in [`web/`](web/). It validates profile URLs locally; generating a setup command does not submit that URL to a server. The optional website analytics and consent policy are described on the site.

## Adapter contract

Every marketplace integration must support a preview plan, use the local profile, run through a user-owned browser context and verify the visible result. Adapters must not store credentials or bypass platform security. Unsupported marketplaces require a separate adapter; never infer support from the plugin version or repository source.

The repository also contains the [`onecv_`-prefixed Supabase schema](supabase/migrations/) for authenticated backup, revision history, platform state and sync audit records. Its presence is not a claim that the published CLI synchronizes profiles.
