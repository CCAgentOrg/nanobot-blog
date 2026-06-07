---
title: "NPPA Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of NPPA (National Pharmaceutical Pricing Authority, MoF) reveals an incomplete SSL certificate chain, external jQuery CDN without integrity checks, and missing Content-Security-Policy on India's drug price regulatory portal."
publishDate: 2026-06-07
tags: ["security", "responsible-disclosure", "india-gov", "pharmaceutical"]
draft: false
---

# NPPA: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | NPPA (National Pharmaceutical Pricing Authority) |
| **Ministry/Body** | MoF (Department of Pharmaceuticals) |
| **Data Category** | Drug Pricing & Manufacturer Data |
| **Sensitivity** | 🟡 Medium |
| **Platform** | Web (Laravel / PHP) |
| **Analysis Date** | 2026-06-07 |
| **Critical** | 0 |
| **High** | 2 |
| **Medium** | 3 |
| **Low** | 1 |

## Summary

NPPA — the body that fixes prices of essential medicines in India — runs a Laravel-based portal with generally good security headers (HSTS with preload, X-Frame-Options DENY, SameSite=Strict cookies). However, the site has an **incomplete SSL certificate chain** causing browser security warnings, loads **jQuery from an external CDN without Subresource Integrity** checks, and has **no Content-Security-Policy**. The actual pricing database system (IPDMS) at nppaipdms.gov.in was **unreachable during analysis**.

## Risk Factors

- **Incomplete SSL chain**: The SSL certificate (Sectigo, valid May-Nov 2026) is missing its intermediate certificate, causing browsers to display security warnings. Users may become accustomed to bypassing these warnings.
- **External jQuery without SRI**: jQuery 3.6.1 is loaded from `code.jquery.com` without a Subresource Integrity hash. If the CDN is compromised, attackers can inject malicious code into the NPPA portal.
- **No Content-Security-Policy**: Without CSP, any XSS vulnerability would be exploitable without restriction.
- **Missing Secure flag on cookies**: Both the XSRF-TOKEN and laravel-session cookies lack the `Secure` flag.
- **IPDMS unreachable**: The Integrated Pharmaceutical Database Management System (actual pricing database) was unreachable during analysis.

## Impact Scenarios

### Scenario 1: CDN Compromise Leading to Data Exfiltration
If `code.jquery.com` is compromised (as happened with the npm/ua-parser-js incident in 2021), the attacker's JavaScript would execute in the context of nppa.gov.in. Since the site has no CSP to restrict data exfiltration, the malicious script could send form submissions, cookies (except HttpOnly ones), and page content to the attacker — including pharmaceutical company registration data and pricing submission forms.

### Scenario 2: SSL Warning Fatigue
Pharmaceutical companies and government officials accessing NPPA regularly encounter browser SSL warnings. This conditions them to click through security warnings, making them vulnerable to actual MITM attacks on other government portals. A government portal that trains users to ignore SSL warnings undermines the security of the entire ecosystem.

### Scenario 3: Pricing Database Unavailability
If the IPDMS system (nppaipdms.gov.in) is persistently unreachable, pharmaceutical companies cannot submit pricing data, and NPPA cannot enforce ceiling prices. This could delay price notifications for essential medicines, directly affecting patients who depend on affordable drugs.

## Findings Overview

| # | Severity | Category | Finding |
|---|----------|----------|---------|
| 1 | 🟠 High | SSL/TLS | Incomplete certificate chain — intermediate certificate missing |
| 2 | 🟠 High | Supply Chain | jQuery loaded from external CDN without Subresource Integrity |
| 3 | 🟡 Medium | Missing Header | No Content-Security-Policy |
| 4 | 🟡 Medium | Session Management | XSRF-TOKEN and session cookies missing Secure flag |
| 5 | 🟡 Medium | Availability | IPDMS (nppaipdms.gov.in) unreachable during analysis |
| 6 | 🟢 Low | Library Version | jQuery 3.6.1 (minor XSS variant in HTML parser) |

### Positive Findings

NPPA has several strong security measures:
- **HSTS**: `max-age=31536000; includeSubDomains; preload` — excellent
- **X-Frame-Options**: `DENY` — strongest setting
- **SameSite=Strict**: Both cookies use Strict mode
- **HttpOnly**: Session cookie is HttpOnly
- **Permissions-Policy**: Restricts camera, microphone, geolocation
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **No third-party tracking**: No Facebook Pixel or Google Analytics
- **Laravel CSRF protection**: Proper XSRF-TOKEN implementation

## Why This Matters

NPPA controls the prices of over 900 essential medicines through the Drug Price Control Order (DPCO). Pharmaceutical companies submit pricing data through this portal, and NPPA publishes ceiling prices that directly affect what patients pay at pharmacies. The integrity of this system affects the affordability of medicines for 1.4 billion people.

The incomplete SSL chain is particularly concerning for a financial regulatory body. If users are trained to ignore browser warnings on NPPA, they'll ignore them on their bank's website too. [CERT-In's directives](https://www.cert-in.org.in/) specifically require government websites to maintain valid SSL certificates.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-07 | Blog post published |
| 2026-06-07 | CERT-In notification (planned) |
| 2026-06-07 | MoF notification (planned) |
| 2026-09-05 | 90-day disclosure deadline |

## Recommendations

### Immediate (0-30 days)
- **Fix SSL certificate chain**: Install the Sectigo intermediate certificate on the server. This is a configuration fix, not a new certificate.
- **Add SRI to jQuery**: Either host jQuery locally or add `integrity` and `crossorigin` attributes to the script tag.
- **Add Secure flag to cookies**: Configure Laravel to set `secure` flag on all cookies (since the site uses HTTPS).

### Short-term (30-90 days)
- **Add Content-Security-Policy**: Implement CSP with `script-src 'self'` to prevent XSS and enforce local-only scripts.
- **Host jQuery locally**: Remove dependency on external CDN — government portals should be self-contained.
- **Monitor IPDMS availability**: Ensure the pricing database system is accessible and monitored.

### Structural (90+ days)
- **Certificate monitoring**: Implement automated certificate expiry and chain validation monitoring.
- **Subresource Integrity policy**: Mandate SRI for all external resources across MoF portals.
- **Availability SLA**: Establish an uptime SLA for IPDMS with automated alerting.

---

*Part of the [Indian Government Portal Security Audit](/blog/) series. See the [dashboard](https://cashlessconsumer.zo.space/govt-security-audit) for progress.*
