---
name: manage-freelancer-profiles
description: Manage, validate, map, and update a freelancer's portable 1CV profile with the local-first 1CV CLI. Use when a user wants to create one master CV/profile, preview fields for a freelance marketplace, fill or update a marketplace profile in their own browser, apply to BizForward, or avoid repeatedly maintaining Malt, Freelancer.com, freelancermap, and similar profiles.
---

# Manage Freelancer Profiles

Use the 1CV CLI as the deterministic layer. Keep personal data and browser sessions on the user's machine.

## Workflow

1. Check that `1cv` is available with `command -v 1cv`. If absent during beta, use `npx @danielsinewe/1cv@next` for every command. From the source repository only, build with `npm --prefix cli install && npm --prefix cli run build` and invoke `node cli/dist/cli.js`.
2. Create a profile only when it does not exist: `1cv init`. Never overwrite one without explicit approval.
3. Validate with `1cv profile`. Read [profile-schema.md](references/profile-schema.md) only when editing or generating profile JSON.
4. List supported adapters with `1cv platforms`.
5. Always preview a platform mapping with `1cv plan <platform>` before opening a browser.
6. Run `1cv apply <platform>` to fill the form and stop for human review.
7. Add `--consent --submit` only when the user explicitly authorizes that exact submission. Never infer legal consent.

## Browser and authentication

- Prefer 1CV's dedicated persistent Chrome profile. Let the user complete login, CAPTCHA, passkey, MFA, or Cloudflare checks themselves.
- Reuse an explicitly provided remote-debugging browser with `--cdp-url`; do not extract or store cookies or passwords.
- Do not attempt to bypass bot protection.
- Treat a fill as incomplete until the browser shows the expected values.
- Treat a submission as complete only after the platform's confirmation is visible.

## Platform handling

For BizForward-specific fields and limits, read [bizforward.md](references/bizforward.md). The public form is only the first intake. Do not claim that an expert-pool profile was created until BizForward sends and the user opens a personalized invitation.

For an unsupported marketplace, inspect its current form in the user's browser, create or update a typed adapter in the CLI, test preview mode, and preserve the preview/review/submit boundary.

## Output

Report only:

- profile validation result;
- mapped fields and missing data;
- whether the browser was filled;
- whether anything was submitted;
- the visible confirmation when submitted.
