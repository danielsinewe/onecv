# BizForward adapter

Current public intake: `https://bizforward.de/freelancer-sign-up/`

| BizForward field | 1CV source | Required |
|---|---|---|
| Name | `identity.fullName` | yes |
| E-Mail | `identity.email` | yes |
| Fachgebiet | `professional.specialties` | yes |
| Dein Profil | first available LinkedIn, XING, website, or GitHub URL | yes |
| CV | `assets.cv` | no, maximum 25 MB on the current form |
| Einwilligung | explicit `--consent` flag | yes for submission |

The public form requests screening for BizForward's freelancer pool. A successful submission is not yet an expert account. BizForward reviews the intake and may send a personalized invitation for the full profile, where professional background, project preferences, regions, and availability can be maintained.

Use accessible labels rather than generated CSS classes. If labels or the flow change, stop before submission and update the adapter from a fresh browser inspection.

The CLI waits for BizForward's delayed cookie window, automatically keeps only necessary cookies, verifies that the window closed, and then fills the form.

After a verified fill, the CLI writes a private local snapshot to `~/.1cv/platforms/bizforward.json`. `1cv diff bizforward` compares the current mapping with that snapshot. `1cv status bizforward` reports a submission only when the confirmation was visible; local state is not evidence of acceptance into BizForward's expert pool.
