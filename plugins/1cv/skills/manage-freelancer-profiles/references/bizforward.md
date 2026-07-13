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

BizForward's cookie manager rejects automated consent clicks. Ask the user to choose `Speichern`, wait for the cookie window to close, and only then fill the form.
