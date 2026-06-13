# Security Policy

## Reporting a Vulnerability

Email **aaron@jieren.my.id** with subject `[SECURITY] magic-story-image`.

Include: description, reproduction steps, potential impact. You'll get a response within 48 hours.

Please **do not** open a public GitHub issue for security vulnerabilities.

## If You Find a Leaked Key

1. Email the maintainer immediately with the key value and where you found it
2. Do **not** post it publicly
3. The maintainer will rotate the key and rewrite git history within 24 hours

## Secret Management Policy

- API keys and tokens are stored **only** as encrypted n8n credentials
- Nothing secret is ever committed to this repository
- The Pollinations pollen token (`sk_...`) must be added as an HTTP Header Auth credential in n8n — see README for instructions
- If a key is accidentally committed: rotate it immediately, then use `git filter-repo` to purge from history and force-push

## Scope

| Item | Status |
|------|--------|
| Webhook URL visible in JS | Known, by design — static site has no server to hide it. Mitigated by n8n rate limiting + CORS. |
| API keys in client code | Out of scope — must never happen. All secrets stay in n8n credentials. |
| XSS via user input | Not applicable — no user-supplied HTML is rendered. |
