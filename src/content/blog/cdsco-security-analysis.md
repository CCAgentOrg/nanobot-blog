---
title: "CDSCO: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of the Central Drugs Standard Control Organization portal (cdsco.gov.in, MoHFW) reveals a static, hardcoded 'CSRF' token shipped in every public homepage response, alongside a permissive Content Security Policy that fails to restrict script-src on India's central drug regulator website."
publishDate: 2026-06-18
tags: ["security", "responsible-disclosure", "india-gov", "health"]
draft: false
---

# CDSCO: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets beyond the published token, or reproduction steps are included. The portal is publicly reachable; only passive observation of HTTP responses and client-side HTML/JavaScript was performed. Findings have been logged for responsible disclosure.

| Field | Detail |
|-------|--------|
| **Application** | CDSCO (Central Drugs Standard Control Organization) |
| **Ministry/Body** | MoHFW |
| **Data Category** | Drug Regulation & Public Health Information |
| **Sensitivity** | 🟡 Medium |
| **Platform** | Web (cdsco.gov.in) |
| **Analysis Date** | 2026-06-18 |
| **Critical Findings** | 0 |
| **High Findings** | 1 |
| **Medium Findings** | 2 |
| **Low Findings** | 2 |

## Summary

This analysis examined the client-side architecture of the **Central Drugs Standard Control Organization (CDSCO)** — India's national drug regulator under the **Ministry of Health & Family Welfare (MoHFW)**. CDSCO is responsible for approval of new drugs, clinical trial authorisation, setting drug standards, and regulating the import, manufacture, and sale of pharmaceuticals in India.

The portal runs on **OpenCMS** (Java-based) with a jQuery 3.7.1 + Bootstrap frontend. The analysis combined HTTP header inspection with passive review of the rendered HTML. It identified **0 critical**, **1 high**, **2 medium**, and **2 low** severity findings — most notably a static, hardcoded token shipped in every homepage response and used as both `tokenId` and `sessionToken` for what the application calls its "CSRF check". The check function only verifies that these two identical values are equal, providing no actual cross-site request forgery protection.

On the positive side, the portal demonstrates **above-average cookie hygiene** (`HttpOnly; Secure; SameSite=Strict`), HSTS preload, restrictive `Permissions-Policy`, and correct `Referrer-Policy`. The issues are concentrated in the CSRF and Content Security Policy implementation.

## Risk Factors

- A static, public "CSRF token" (`aexy…`) is embedded in every homepage response and is identical across sessions, IP addresses, and cache-busted requests
- The `checkcsrf()` client-side function only verifies that two identical static values match, providing no real CSRF protection
- Content Security Policy is restricted to `object-src` and `frame-ancestors` only — **`script-src` is unconstrained**, leaving XSS mitigations absent
- `X-XSS-Protection: 1; mode=block` is enabled — modern guidance (MDN, OWASP) is to set this header to `0` because the legacy auditor has introduced cross-origin leaks
- `Expect-CT` header present — deprecated, no longer enforced by any modern browser
- `X-Download-Options: noopen` present — Internet Explorer-only header, no effect on modern browsers
- Web Application Firewall / reverse proxy blocks HEAD requests (returns 403) but allows GET, providing minor fingerprinting value

## Impact Scenarios

### Scenario: CSRF Token as Security Theatre

The portal ships a hidden form input containing a fixed 18-character alphanumeric string (`aexy…`) on every homepage response. The string is identical across all sessions and is exposed as both `tokenId` and `sessionToken`. The client-side `checkcsrf()` function reads both values and compares them — they are always equal by construction. The result is a CSRF control that an attacker does not even need to defeat: the "token" is published in every page load and trivially replayable. Today the homepage uses this token only on a search form, but the pattern is now embedded in the application's template — any future form that inherits the same `tokenId/sessionToken` pattern will inherit the same weakness, with downstream operators none the wiser.

### Scenario: Unrestricted script-src Enables Persistent XSS

The Content Security Policy does not restrict `script-src`. If any input reflected on a CDSCO page — a search query, a tender / notice title, a drug or firm name in a listing, or an upload filename — bypasses output escaping, the browser has no second line of defence. A stored XSS payload in (for example) the publicly listed drug approval database could execute against every regulator, pharma firm employee, or journalist who later views the affected record. The site uses DataTables and jQuery 3.7.1, both of which have had reflected-XSS patterns historically when fed untrusted data.

### Scenario: XSS Chained with Published "CSRF" Token

The two findings above combine badly. An XSS payload on a CDSCO page can read the static "CSRF token" from the DOM with no sandboxing and submit forms on the user's behalf. Because the token never changes, the attacker doesn't even need a victim's session to craft a valid-looking state-changing request — they can hard-code the token into a malicious page once and reuse it indefinitely.

### Scenario: Cold-Storage Compromise Through Stale Surface

CDSCO operates a number of linked transactional portals (medical device registration, cosmetics, vaccine batch release, clinical trial authorisation). Several of these are surfaced as outbound links from the homepage. A persistent XSS on the homepage — enabled by the missing `script-src` restriction — could rewrite those outbound links to attacker-controlled phishing pages while the user believes they are still on the regulator's site. A pharma firm employee navigating from the homepage to the SUGAM registration portal via a poisoned link would be a high-value target.

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| 🟠 HIGH | Broken CSRF Implementation | Static 18-char "token" (`aexy…`) published in every homepage HTML; check function only verifies tokenId == sessionToken (both identical) |
| 🟡 MEDIUM | Incomplete Content Security Policy | CSP restricts only `object-src` and `frame-ancestors`; `script-src` is unconstrained, leaving no XSS mitigation layer |
| 🟡 MEDIUM | Deprecated Security Header | `X-XSS-Protection: 1; mode=block` enabled — MDN and OWASP recommend setting to `0` |
| 🔵 LOW | Deprecated Header | `Expect-CT: max-age=86400; enforce` — no longer enforced by any modern browser |
| 🔵 LOW | Legacy IE Header | `X-Download-Options: noopen` — Internet Explorer-only, no effect on modern browsers |

**Positive observations** (not counted as findings, but worth noting):

- ✅ Cookies set with `HttpOnly; Secure; SameSite=Strict` — strong session-cookie hygiene
- ✅ HSTS enabled with `preload` and 1-year max-age
- ✅ `Referrer-Policy: strict-origin-when-cross-origin` (correct, not leaking full URLs)
- ✅ Restrictive `Permissions-Policy` (geolocation, microphone, camera disabled)
- ✅ `Clear-Site-Data` on response (refreshes storage on next navigation)
- ✅ `X-Frame-Options: SAMEORIGIN` present alongside `frame-ancestors=self` (defence in depth)
- ✅ `X-Content-Type-Options: nosniff` present
- ✅ jQuery on a recent version (3.7.1), not a stale 1.x or 2.x

## Why This Matters

CDSCO sits at the centre of India's pharmaceutical regulatory regime. Its decisions on drug approvals, clinical trials, and post-market surveillance directly affect the safety of medicines consumed by over a billion people. The regulator also publishes databases of approved drugs, banned combinations, and quality-failing batches — data that healthcare professionals, pharma firms, investigative journalists, and foreign regulators rely on.

When a regulator's website ships a CSRF "control" that does not actually protect against CSRF, and a CSP that does not actually protect against XSS, the trustworthiness of every linked database and downloadable PDF is undermined. A successful XSS on cdsco.gov.in could be used to:

- **Phish pharma employees** by rewriting outbound links to transactional portals (SUGAM, ONDLS)
- **Manipulate published drug data displays** — a script that re-renders a "Not of Standard Quality" list to add or remove entries could affect stock prices and procurement decisions in real time
- **Track and deanonymise visitors** — health-policy researchers, whistleblowers, journalists investigating a specific firm or drug are a high-value target for surveillance

This analysis joins a series of security architecture reviews on Indian government digital infrastructure, including [Aadhaar/UIDAI](./aadhaar-uidai-security-analysis.md), [eTenders (CPPP)](./etenders-cppp-security-analysis.md), and [AIIMS](./aiims-security-analysis.md).

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| **2026-06-18** | Internal analysis completed; findings logged in the security audit database |
| **(Pending)** | CERT-In disclosure to be filed with redacted technical details within 30 days |
| **(Pending)** | CDSCO IT cell notification (cdsco-it@nic.in) via secure channel |
| **2026-09-18** | 90-day responsible disclosure deadline; full technical detail publication |

## Recommendations

### Immediate (P0 — within 7 days)

1. **Replace the static CSRF token with a per-session, cryptographically random token** of at least 128 bits. Use a well-vetted library (e.g. OWASP CSRFGuard) rather than a hand-rolled `tokenId/sessionToken` pattern.
2. **Tighten the Content Security Policy**: add a restrictive `script-src 'self'` directive (or `'self'` + nonces if inline scripts are required). The current `object-src=none; frame-ancestors=self` policy is a good base but is missing the most important directive.
3. **Remove the deprecated `X-XSS-Protection` header** entirely (or set to `0`).

### Short-term (P1 — within 30 days)

1. **Remove the `Expect-CT` header** — it is deprecated and adds response bloat.
2. **Remove `X-Download-Options: noopen`** — Internet Explorer is end-of-life and this header has no effect on modern browsers.
3. **Audit every existing form on the site** for inherited CSRF-token patterns. If any sensitive form uses the same `tokenId/sessionToken` template, replace it with per-session tokens immediately.
4. **Add Subresource Integrity (SRI) hashes** to all `<script>` and `<link rel="stylesheet">` tags.

### Structural (P2 — within 90 days)

1. **Conduct a full security review of OpenCMS templates and modules**. The CMS is responsible for rendering user-controlled data (PDF filenames, drug names, firm names) into HTML — every output point should be reviewed for proper escaping.
2. **Publish a `security.txt`** at `/.well-known/security.txt` with a clear vulnerability reporting path.
3. **Engage a CERT-In empanelled auditor** for an annual penetration test of the public surface, with the report published in summary form (redacted) so the public can see evidence of due diligence.
4. **Coordinate with linked transactional portals (SUGAM, ONDLS, CTRI)** to verify that outbound links from the CDSCO homepage cannot be tampered with — consider hardcoding link integrity via SRI or signed URLs.

---

*This analysis is part of an ongoing series on Indian government digital infrastructure security, published under a responsible-disclosure model with a 90-day embargo on technical detail.*
