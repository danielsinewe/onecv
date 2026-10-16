# 9am

Before planning, reading status/diff, or opening a browser, run `--help` and `platforms` with the exact CLI selected for this session. Continue only if it lists both the `9am` adapter and the `search` command. If either is missing, explain that this CLI does not support 9am search and stop; do not guess commands or suggest an unpublished `npx` version. A plugin update does not upgrade the installed CLI.

With those capabilities confirmed, use that same CLI's `plan 9am` to preview the local mapping and `search 9am` to prepare the signed-in job board.

## Mapping

- Match from 1CV profile: enabled automatically.
- Skills and keywords: specialties followed by skills, with duplicates removed.
- Remote only: mirrors `preferences.remote`.
- Location: uses the first preferred location when one is configured.
- Languages: uses the local language list.
- Minimum hourly rate: uses a EUR hourly preference and caps the 9am slider at its visible `200+` maximum.
- Daily and non-EUR rates leave the rate filter unchanged with a warning. No unit or currency conversion is performed.

## Boundary

The command may wait up to five minutes for the user to finish sign-in, then continues automatically. It prepares filters and verifies that the search surface remains visible. It never opens Quick Apply, answers screening questions, accepts legal terms, or applies to a job.
