---
title: "NEET/NTA Portals: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of NTA portals reveals completely broken security headers on the main site, ASP.NET runtime errors exposed, WordPress REST APIs on exam portals, and inconsistent security posture across sub-domains."
publishDate: 2026-05-31
tags: ["security", "responsible-disclosure", "india-gov", "education"]
draft: false
---

## Responsible Disclosure Notice

This is a **security architecture analysis** of the National Testing Agency (NTA) web infrastructure. It describes **categories of findings** without disclosing specific exploit paths. No unauthorized access was attempted or gained.

| Field | Detail |
|-------|--------|
| **Application** | NTA Portal Ecosystem (nta.ac.in + exam sub-domains) |
| **Ministry** | MoE (Ministry of Education) |
| **Category** | Education / National Examinations |
| **Sensitivity** | Critical (exam data, student PII, results for millions) |
| **Platform** | Web (ASP.NET + WordPress/S3Waas) |
| **Analysis Date** | 2026-05-31 |
| **Findings** | 1 Critical, 5 High, 4 Medium, 2 Low |

## Summary

The National Testing Agency's web infrastructure — responsible for conducting NEET, JEE, CUET, and other national-level examinations affecting millions of students — has **completely broken security headers on its main portal**. The `X-Frame-Options`, `X-Content-Type-Options`, and `Strict-Transport-Security` headers are all malformed and non-functional due to apparent misconfiguration. The exam-specific sub-domains (NEET, JEE) running on WordPress/S3Waas have significantly better security configuration, while the CUET portal lacks critical protections entirely. The main portal also exposes ASP.NET runtime errors on its login endpoint.

## Risk Factors

- **All security headers broken on main site**: X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy all malformed or invalid
- **ASP.NET runtime error exposed**: Login page reveals framework details and error configuration instructions
- **WordPress REST API exposed**: wp-json endpoints on NEET, JEE, and exams portals leak WordPress installation metadata
- **Inconsistent security across sub-domains**: Ranges from excellent (JEE/NEET with CSP, Permissions-Policy, HSTS preload) to broken (main site) to minimal (CUET)
- **Client-side session management**: 20-minute session timeout enforced only in JavaScript

## Impact Scenarios

### Scenario 1: Clickjacking on Main Portal

With `X-Frame-Options` set to the malformed value `SAMEORIGIN: no-referrer`, browsers will ignore the header entirely. An attacker could embed the NTA main portal in an invisible iframe on a malicious website. A student visiting what appears to be an NTA resource page could unknowingly interact with the real portal — potentially submitting forms, changing settings, or accessing their exam data while the attacker captures their actions.

### Scenario 2: No HSTS Protection

The `Strict-Transport-Security` header is not present as a valid header. Instead, its intended value (`max-age=31536000; includeSubDomains`) is appended to the `X-Content-Type-Options` header as `nosniff: max-age=31536000`. This means browsers will NOT enforce HTTPS connections to nta.ac.in. A student accessing the site from a public WiFi network (common during exam season at coaching centers) could be silently downgraded to HTTP via a man-in-the-middle attack, exposing their credentials and session data.

### Scenario 3: WordPress API Reconnaissance

The publicly accessible `wp-json` API on NEET, JEE, and other exam portals reveals WordPress version, installed plugins, user information, and REST API endpoints. An attacker could use this information to identify vulnerable plugins or WordPress versions, then craft targeted attacks against the exam registration systems during critical registration periods.

## Findings Overview

| # | Severity | Category | Detail |
|---|----------|----------|--------|
| 1 | CRITICAL | Configuration | All security headers malformed on nta.ac.in — X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy non-functional |
| 2 | HIGH | Information Disclosure | ASP.NET runtime error exposed on /Login endpoint with framework details and config instructions |
| 3 | HIGH | Configuration | No functional HSTS on main site — value incorrectly merged with X-Content-Type-Options |
| 4 | HIGH | Information Disclosure | WordPress REST API (wp-json) exposed on NEET, JEE, and exams portals |
| 5 | HIGH | Configuration | CUET portal missing CSP, X-Frame-Options, Permissions-Policy — minimal security headers |
| 6 | HIGH | Inconsistency | Wildly different security posture across sub-domains (broken → excellent → minimal) |
| 7 | MEDIUM | Session Management | Client-side 20-minute session timeout bypassable via browser developer tools |
| 8 | MEDIUM | Infrastructure | Exams portal on HTTP/1.1 (no HTTP/2) suggesting older infrastructure |
| 9 | MEDIUM | Code Quality | ASP.NET template syntax (`<%=5.8%>`) appearing in static CSS URLs — suggests rendering issues |
| 10 | MEDIUM | Configuration | No Content-Security-Policy on main NTA portal |
| 11 | LOW | Information Disclosure | PHP session cookies (PHPSESSID) visible on exam portals |
| 12 | LOW | Information Disclosure | Varnish cache headers on CUET reveal CDN/caching infrastructure |

## Why This Matters

NTA conducts examinations that determine the academic future of **over 30 million students annually** across NEET (medical), JEE (engineering), CUET (university admissions), UGC-NET, and other exams. The data handled includes student personal information, photographs, exam scores, and rank information.

The **broken security headers** on the main NTA portal are particularly concerning during exam result seasons, when millions of students simultaneously access the site. Without HSTS, these students are vulnerable to TLS downgrade attacks — especially at coaching centers and cyber cafes where shared networks are common.

The **inconsistent security posture** across sub-domains suggests that NTA's security configuration is not centrally managed. The S3Waas-based exam portals have good security (likely managed by NIC), while the main portal and CUET have poor or broken configurations.

Previous analyses in this series:
- [Passport Seva](/blog/passport-seva-security-analysis/) — Blowfish encryption, hardcoded internal IPs
- [CBSE OASIS](/blog/cbse-oasis-security-analysis/) — Dual tech stacks, client-side password hashing
- [U-WIN Vaccinator](/blog/uwin-vaccinator-security-analysis/) — Hardcoded secret keys in Co-WIN

## Architecture Notes

The NTA ecosystem spans multiple technology stacks:

| Sub-domain | Stack | Security |
|-----------|-------|----------|
| `nta.ac.in` | ASP.NET Framework (IIS) | **Broken** — all headers malformed |
| `neet.nta.nic.in` | WordPress + S3Waas | Good — CSP, Permissions-Policy, HSTS preload |
| `jeemain.nta.nic.in` | WordPress + S3Waas | Good — CSP, Permissions-Policy, HSTS preload |
| `exams.nta.nic.in` | WordPress + S3Waas | Moderate — CSP, but no Permissions-Policy, HTTP/1.1 |
| `cuet.nta.nic.in` | WordPress + Varnish | Minimal — no CSP, no Permissions-Policy, no X-Frame-Options |

The main portal runs ASP.NET Framework on IIS, while exam portals use the Government of India's S3Waas (Secure, Scalable & Sugamya Website as a Service) platform built on WordPress.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-05-31 | Blog post published (categories only) |
| 2026-06-15 | CERT-In disclosure planned |
| 2026-08-31 | Full 90-day disclosure deadline |

## Recommendations

### Immediate
1. **Fix security headers on nta.ac.in** — This is the highest priority. The X-Frame-Options, X-Content-Type-Options, HSTS, and Referrer-Policy headers are all malformed and must be corrected immediately
2. **Add HSTS with preload** — `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
3. **Fix the /Login endpoint** — Remove or properly handle the ASP.NET runtime error; configure custom error pages
4. **Disable WordPress REST API** on exam portals — Restrict wp-json access to authenticated users only

### Short-term
5. **Standardize security headers** across all sub-domains — Follow the S3Waas security template used on NEET/JEE
6. **Move session management to server-side** — Client-side JavaScript timeouts can be trivially bypassed
7. **Add CSP to CUET portal** — Currently has no Content-Security-Policy
8. **Suppress ASP.NET template artifacts** — Fix the `<%=5.8%>` syntax appearing in CSS URLs

### Structural
9. **Centralize security configuration** — All NTA sub-domains should inherit from a shared security policy
10. **Adopt a vulnerability disclosure program** — NTA should have a public VDP given its critical role
11. **Upgrade main portal infrastructure** — Consider migrating from ASP.NET Framework to a modern stack
12. **Conduct pre-exam security audits** — Test security posture before each major exam cycle

---

*This analysis was performed using publicly accessible web pages and standard HTTP inspection tools. No unauthorized access was attempted. Findings are reported responsibly with a 90-day disclosure timeline.*
