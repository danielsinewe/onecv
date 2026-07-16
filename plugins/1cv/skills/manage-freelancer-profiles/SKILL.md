---
name: manage-freelancer-profiles
description: Manage, validate, map, and update a freelancer's portable 1CV profile with the local-first 1CV CLI. Use when a user wants to create one master CV/profile, prepare 9am job matching, preview fields for a freelance marketplace, fill or update a marketplace profile in their own browser, apply to BizForward, or avoid repeatedly maintaining marketplace profiles.
---

# Manage Freelancer Profiles

Use the 1CV CLI as the deterministic layer. Keep personal data and browser sessions on the user's machine.

## Workflow

1. Check that `1cv` is available with `command -v 1cv`. If absent during beta, use `npx @danielsinewe/1cv` for every command. From the source repository only, build with `npm --prefix cli install && npm --prefix cli run build` and invoke `node cli/dist/cli.js`.
2. When the user provides their own LinkedIn profile URL in a Codex desktop task, use Codex's in-app browser and open the exact URL. Let the user handle login, MFA, CAPTCHA, or verification. Read only profile information visibly available to that user, including name, headline, location, about text, skills, languages, and public links. Never use a remote scraper or extract browser credentials.
3. Show the extracted profile as a concise review before saving it. Ask only for required information LinkedIn does not provide, especially email. Do not invent missing facts.
4. Create a profile only when it does not exist: `1cv init`. Never overwrite one without explicit approval. Use `1cv edit` for normal updates so the user does not need to edit JSON. Read [profile-schema.md](references/profile-schema.md) only when the full schema is needed.
5. Validate with `1cv profile`.
6. List supported adapters with `1cv platforms`.
7. Check `1cv status <platform>` and `1cv diff <platform>`, then preview with `1cv plan <platform>` before opening a browser.
8. For 9am, read [9am.md](references/9am.md), run `1cv search 9am`, and leave actual job applications to the user. For intake forms, run `1cv apply <platform>` and stop for human review. A verified preparation updates only local platform state.
9. Add `--consent --submit` only when the user explicitly authorizes that exact submission. Never infer legal consent. Record submission state only after visible confirmation.

## Browser and authentication

- For LinkedIn import and marketplace preparation in a Codex desktop task, prefer Codex's in-app browser so browser work stays inside Codex.
- Use 1CV's dedicated persistent Chrome profile for direct `1cv apply` browser automation. Let the user complete login, CAPTCHA, passkey, MFA, or Cloudflare checks themselves.
- Reuse an explicitly provided remote-debugging browser with `--cdp-url`; do not extract or store cookies or passwords.
- Do not attempt to bypass bot protection.
- Let the CLI automatically keep only BizForward's necessary cookies before filling. Do not ask the user to handle the cookie window.
- Treat a fill as incomplete until the browser shows the expected values.
- Treat a submission as complete only after the platform's confirmation is visible.
- Do not treat an earlier submission as proof that a newer fill was submitted; use `1cv status`.

## Platform handling

For BizForward-specific fields and limits, read [bizforward.md](references/bizforward.md). The public form is only the first intake. Do not claim that an expert-pool profile was created until BizForward sends and the user opens a personalized invitation.

For 9am, read [9am.md](references/9am.md). Treat job-search preparation and applying to a particular job as separate workflows. Never convert `1cv search 9am` into an application action.

For an unsupported marketplace, inspect its current form in the user's browser, create or update a typed adapter in the CLI, test preview mode, and preserve the preview/review/submit boundary.

## Output

Report only:

- profile validation result;
- mapped fields and missing data;
- whether the browser was filled;
- whether anything was submitted;
- the visible confirmation when submitted.
