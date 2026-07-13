# 1CV profile schema

The default file is `~/.1cv/profile.json`. It contains portable profile data, never credentials or browser cookies.

```json
{
  "version": 1,
  "identity": {
    "fullName": "Ada Example",
    "email": "ada@example.com",
    "phone": "+49 ...",
    "location": "Berlin, Germany",
    "links": {
      "website": "https://example.com",
      "linkedin": "https://linkedin.com/in/example",
      "xing": "https://xing.com/profile/example",
      "github": "https://github.com/example"
    }
  },
  "professional": {
    "headline": "Independent product engineer",
    "summary": "Short reusable introduction",
    "specialties": ["Software Development"],
    "skills": ["TypeScript", "Product strategy"],
    "languages": ["German", "English"]
  },
  "preferences": {
    "availableFrom": "2026-08-01",
    "remote": true,
    "locations": ["Berlin"],
    "rate": { "amount": 900, "currency": "EUR", "unit": "day" }
  },
  "assets": { "cv": "~/Documents/CV.pdf" }
}
```

Required fields are `version`, `identity.fullName`, `identity.email`, `professional.headline`, and at least one `professional.specialties` entry. Individual platform adapters may require more. Prefer LinkedIn, then XING, website, then GitHub when a platform accepts only one public profile URL.
