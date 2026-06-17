---
title: "eCourts Services: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of eCourts Services (e-Committee, Supreme Court of India) reveals URL-embedded session tokens, commented-out CSRF protection, debug code shipped to production, and deprecated security headers on India's primary citizen-facing judiciary portal."
publishDate: 2026-06-17
tags: ["security", "responsible-disclosure", "india-gov", "identity"]
draft: false
---

# eCourts Services: Security Architecture Analysis

## Responsible Disclosure Notice

This analysis is based on publicly observable HTTP responses and the JavaScript bundles the eCourts portal ships to every visitor's browser. **No authentication was bypassed, no non-public endpoint was probed, and no exploit attempt was made.** All findings below can be reproduced by any visitor with a browser developer tools panel. Specific internal identifiers, secret values, and reproduction chains are intentionally omitted.

## Metadata

| Field | Value |
|---|---|
| Application | eCourts Services (Single Sign-On + Case Status) |
| Ministry | Law & Justice — e-Committee, Supreme Court of India |
| Maintained By | National Informatics Centre (NIC) |
| Category | Identity / Judiciary Case Records |
| Sensitivity | High — names, addresses, case details, advocate identities, FIR references |
| Platform | Web (PHP-style routing) + Android/iOS app (`com.ecourtsindia.eci`) |
| Audit Date | 2026-06-17 |

## Summary

The eCourts Services portal is one of the highest-traffic citizen-facing legal services in the world — it serves case-status lookups, court orders, cause lists, and e-filing for the entire Indian subordinate judiciary. Despite the sensitivity of the data, the portal exhibits multiple security anti-patterns that would not pass a contemporary web-security audit: **session tokens are propagated via URL query parameters, CSRF protection is commented out in production, debug `alert()` statements (including the developer's first name) are shipped in the production JS bundle, and the response headers rely on deprecated specifications.**

## Risk Factors

- **Session token (`app_token`) propagated in URL query string.** The application's `setToken()` routine rewrites every internal `<a href>` on the page to append `?app_token=<hex>` (or `&app_token=<hex>` if a query string already exists). This is a textbook OWASP session-management anti-pattern: the token leaks via the HTTP `Referer` header to any external site the user clicks through to, via browser history, via proxy logs, via shared screenshots, and via browser sync.
- **CSRF protection commented out in production.** The HTML contains `<!--<script src="/ecourts2.0//csrf-magic.js"></script>-->` — the CSRF middleware script tag is present in the source but disabled. Every POST request the application makes (login, registration, change-password) is therefore potentially vulnerable to cross-site request forgery.
- **Debug code shipped to production.** The production `ecourts.js` bundle contains multiple `alert('anil'...)` debug statements — strong evidence that developer-facing diagnostic code was never stripped before deployment. The developer's first name (`anil`) is embedded in the public source as a result.
- **`async: false` jQuery AJAX calls.** All major data calls use `jQuery.ajax({ async:false })`, which is a deprecated browser API that blocks the UI thread and is also flagged by modern security scanners as a code-smell indicating unmaintained dependencies.
- **Deprecated security headers.** `Expect-CT: max-age=3600, enforce` (the spec was retired by Chrome in 2022) and `X-XSS-Protection: 1; mode=block` (deprecated since 2020, can introduce cross-site information leaks in modern browsers) are both present. Neither does anything useful today.
- **No Content-Security-Policy.** Despite serving a high-volume citizen portal, the responses contain no CSP header. Inline scripts, eval, third-party iframes, and arbitrary injected scripts are all permitted by default.
- **Predictable-looking session cookie.** The `JSESSION` cookie is set as an 8-digit numeric value (e.g., `JSESSION=82140251`). Even if this is merely a frontend routing token (PHP session IDs are normally longer and higher-entropy), the format is alarming at first glance and warrants verification.
- **Documented attack history.** The Delhi High Court virtual hearings were repeatedly disrupted by intrusions playing obscene content during a live Chief Justice bench hearing in April 2026.[^1] NCLT Kolkata bench also suspended virtual hearings over a cybersecurity issue.[^2]

## Impact Scenarios

1. **Session hijack via Referer leakage.** A citizen logged into eCourts clicks a link in a court order PDF that points to an external site (a law firm, a news article, a government PDF on a different origin). The external site's server logs the citizen's `app_token` in the `Referer` header. Anyone with access to those logs — including any third-party analytics the external site runs — can replay the token and assume the citizen's session.
2. **Cross-site request forgery against password change.** Because CSRF protection is commented out, an attacker who lures a logged-in user to a hostile page can submit a POST to the change-password endpoint with attacker-controlled values. Combined with the client-side SHA-256 password hashing (the new password reaches the server already-hashed), the attacker does not even need to know the hashing implementation — the user's own browser will hash the attacker's chosen password.
3. **Session token in screenshots.** Litigants frequently screenshot case-status pages to share with advocates or family members. The URL bar — and therefore the `app_token` — is visible in most screenshots. A leaked screenshot of a "win" can leak a live session.
4. **Browser-history exfiltration on shared PCs.** Cyber-cafés and law-firm shared computers retain full browsing history including URL query parameters. A subsequent user of the same machine can replay the URL and inherit the previous user's eCourts session.
5. **Virtual-hearing disruption recurrence.** The Delhi HC incident is not a one-off; the underlying vulnerability (unauthorized stream injection into virtual court sessions) is structural and remains possible as long as the case-management stack operates on legacy infrastructure without modern real-time-streaming authentication.

## Findings Overview

| Severity | Category | Notes |
|---|---|---|
| CRITICAL | Session token in URL parameters | `app_token` propagated via query string on every link |
| CRITICAL | CSRF protection commented out | `csrf-magic.js` script tag is disabled in production HTML |
| HIGH | Debug code in production bundle | Multiple `alert('anil'...)` statements shipped to every visitor |
| HIGH | No Content-Security-Policy | No CSP header in any response — arbitrary inline scripts permitted |
| HIGH | Documented attack history | Delhi HC virtual-hearing breach (2026-04) |
| MEDIUM | Client-side SHA-256 password hashing | No salt visible; rainbow tables applicable to leaked hashes |
| MEDIUM | Deprecated security headers | `Expect-CT` and `X-XSS-Protection` retained despite deprecation |
| LOW | `async:false` jQuery AJAX | Deprecated API, indicates unmaintained code path |
| LOW | Double-slash URL pattern | `/ecourts2.0//` in asset paths — minor hygiene issue |
| LOW | `JSESSION` cookie format | 8-digit numeric cookie — appears low-entropy at first glance |

## Why This Matters

The eCourts portal is the digital backbone of the Indian subordinate judiciary. The National Judicial Data Grid (NJDG), surfaced through this portal, contains the case-level details of every pending and decided case in every district and taluka court in the country. The portal also handles advocate registration, e-filing, and the unique CNR (Case Number Record) lookup that has become the de-facto identifier for any case-related transaction in India.

The combination of **session-in-URL + commented-out CSRF + no CSP + debug code in production** is a stack of compensating-control failures. Each one alone is a moderate finding; together they create the conditions for the kind of session-takeover and CSRF attack that contemporary web applications are expected to prevent by default. The Delhi High Court virtual-hearing breach is a real-world illustration of the impact — and is structurally traceable to the same kind of legacy infrastructure that this analysis documents at the citizen-facing tier.

This analysis should be read alongside the broader pattern across Indian government portals: the same header hygiene gap (legacy X-Frame-Options + Expect-CT instead of a modern CSP) was documented in the **NSDL e-Services**, **CBSE OASIS**, and **NTA** analyses. The session-in-URL pattern is the same anti-pattern flagged in the **PM-Kisan** and **Pension Seva** analyses.

## Responsible Disclosure Timeline

- **2026-06-17**: Public analysis published (this blog post).
- **2026-06-17**: Report filed with CERT-In under responsible disclosure guidelines.
- **2026-06-17**: Report filed with the e-Committee, Supreme Court of India.
- **2026-06-17**: Report filed with NCIIPC.
- **2026-09-15**: 90-day disclosure deadline.

## Recommendations

### Immediate (within 30 days)

1. **Move `app_token` out of the URL.** Stop appending the session token as a query parameter on every internal link. Carry it exclusively in an `HttpOnly; Secure; SameSite=Strict` cookie.
2. **Re-enable CSRF protection.** Uncomment the `csrf-magic.js` script tag (or, better, replace with a modern CSRF-token-per-request pattern).
3. **Strip debug code from production.** Remove all `alert()` calls (including `alert('anil'...)`) from the production `ecourts.js` bundle. Implement a build step that strips `console.log`, `alert`, and `debugger` statements.

### Short-term (within 90 days)

4. **Add a Content-Security-Policy.** Start with `default-src 'self'` and incrementally whitelist the minimum necessary script/style origins. Avoid `unsafe-inline` and `unsafe-eval`.
5. **Remove deprecated security headers.** Drop `Expect-CT` and `X-XSS-Protection`; modern browsers ignore them and their presence signals an outdated review process.
6. **Migrate `jQuery.ajax({async:false})` calls** to modern `fetch()` or async/await. The synchronous variant is deprecated and may be removed by browsers in the future.
7. **Audit and document the JSESSION cookie entropy.** If the 8-digit numeric value is a routing token only, document it as such; if it carries any session authority, regenerate it as a high-entropy cryptographically random value (at least 128 bits).

### Structural

8. **Independent security audit of the case-management stack.** Commission a third-party penetration test that specifically covers session management, CSRF posture, and the CNR-lookup authorization model.
9. **Publish a security disclosure policy** for the e-Committee that gives researchers a clear contact and acknowledgment path. Currently no `security.txt` is published on `ecourts.gov.in`.
10. **Migrate the citizen-facing portal to a modern framework** (the current `?p=controller/method` single-entry-point pattern is a 2008-era PHP convention). A modern server-rendered framework with built-in CSRF, CSP-nonce, and cookie-security defaults would resolve most of these findings in a single migration.

[^1]: "Virtual hearing in Delhi HC disrupted by obscene content," ANI News, 2026-04-29. https://www.aninews.in/news/national/general-news/virtual-hearing-in-delhi-hc-disrupted-by-obscene-content-repeated-intrusions-unverified-hacked-audio-raise-security-concerns20260429135259
[^2]: "Cyber security issue halts virtual hearings at NCLT Kolkata Bench," Lexology. https://www.lexology.com/library/detail.aspx?g=b3f2ddca-c1a1-4124-b73b-40e2cea152ae
