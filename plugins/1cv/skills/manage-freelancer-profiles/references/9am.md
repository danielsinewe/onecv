# 9am

Use `1cv plan 9am` to preview the local mapping and `1cv search 9am` to prepare the signed-in job board.

## Mapping

- Match from 1CV profile: enabled automatically.
- Skills and keywords: specialties followed by skills, with duplicates removed.
- Remote only: mirrors `preferences.remote`.
- Location: uses the first preferred location when one is configured.
- Languages: uses the local language list.
- Minimum hourly rate: uses an hourly preference and caps the 9am slider at its visible `200+` maximum.
- Daily rates are not converted into hourly or fixed-project budgets.

## Boundary

The command may wait up to five minutes for the user to finish sign-in, then continues automatically. It prepares filters and verifies that the search surface remains visible. It never opens Quick Apply, answers screening questions, accepts legal terms, or applies to a job.
