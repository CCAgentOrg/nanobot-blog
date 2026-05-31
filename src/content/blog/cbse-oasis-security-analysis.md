---
title: "CBSE OASIS: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of CBSE OASIS (MoE) reveals dual legacy technology stacks, inconsistent security headers, client-side password hashing with predictable seeds, and a legacy application co-hosted on the same domain."
publishDate: 2026-05-31
tags: ["security", "responsible-disclosure", "india-gov", "education"]
draft: false
---

## Responsible Disclosure Notice

This is a **security architecture analysis** of the CBSE OASIS portal operated by the Central Board of Secondary Education, Ministry of Education. It describes **categories of findings** without disclosing specific exploit paths or authentication flow internals. No unauthorized access was attempted or gained.

| Field | Detail |
|-------|--------|
| **Application** | CBSE OASIS 7.0 (Online Affiliated School Information System) |
| **Ministry** | MoE (Ministry of Education) |
| **Category** | Education / School Affiliation |
| **Sensitivity** | Critical (school data, student records, teacher information) |
| **Platform** | Web only (ASP.NET Core + legacy ASP.NET Framework) |
| **Analysis Date** | 2026-05-31 |
| **Findings** | 1 Critical, 5 High, 4 Medium, 2 Low |

## Summary

CBSE OASIS 7.0 — the portal managing affiliation data for over 28,000 CBSE schools across India — runs two separate web technology stacks on the same domain. The main application uses ASP.NET Core with reasonable security headers, but the password recovery endpoint runs on the legacy ASP.NET Framework 4.x with significantly weaker security configuration. The login form hashes passwords client-side using SHA-256 with a seed value exposed in the HTML source. While security fundamentals (CAPTCHA, anti-forgery tokens, secure cookies) are in place, the architectural inconsistencies and technology version disclosures create an elevated risk profile for a system managing India's largest school board data.

## Risk Factors

- **Dual technology stacks**: ASP.NET Core (modern) and ASP.NET Framework 4.x (legacy) co-hosted on the same domain
- **Inconsistent security posture**: Password recovery endpoint lacks multiple security headers present on the main application
- **Client-side password hashing**: Seed value visible in page source; the hash effectively becomes the authentication credential
- **Version disclosure**: Server software, framework version, and technology stack fully exposed via HTTP headers
- **Legacy application accessible**: An older version of OASIS appears to remain accessible at a different path
- **Short HSTS duration**: Only 30 days on the main portal vs. 1 year on the public academic site

## Impact Scenarios

### Scenario 1: Legacy Framework Exploitation

The password recovery page runs on ASP.NET Framework 4.0.30319, an older technology stack with different security characteristics than the main ASP.NET Core application. If an unpatched vulnerability exists in the framework (ASP.NET Framework has had multiple critical CVEs over the years), it could potentially be exploited through the legacy endpoint to compromise the same domain, affecting the security of the main OASIS application and all school data.

### Scenario 2: Seed-Based Hash Interception

The login process computes `SHA256(seed + SHA256(password))` entirely in the browser. While this prevents raw password transmission, the resulting hash is effectively the credential. An attacker on the same network (e.g., a school's WiFi where a principal is logging into OASIS) who intercepts the HTTPS handshake or exploits a TLS downgrade could capture the hash. Since the seed is predictable and visible in the HTML, the attacker could potentially replay the login with a fresh session.

### Scenario 3: Data at Scale

OASIS manages data for all CBSE-affiliated schools — approximately 28,000+ institutions covering millions of students and hundreds of thousands of teachers. A compromise of this system could expose: school affiliation status, student enrollment data, teacher qualifications and personal details, financial records, and compliance documents. This data could be used for identity theft, social engineering attacks against schools, or competitive intelligence.

## Findings Overview

| # | Severity | Category | Detail |
|---|----------|----------|--------|
| 1 | CRITICAL | Architecture | Dual technology stacks (ASP.NET Core + Framework 4.x) on same domain with different security configurations |
| 2 | HIGH | Authentication | Client-side SHA-256 password hashing with seed value exposed in HTML source |
| 3 | HIGH | Configuration | Password recovery endpoint missing HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| 4 | HIGH | Information Disclosure | Server version (IIS/10.0), framework (ASP.NET), and runtime version (4.0.30319) exposed in headers |
| 5 | HIGH | Configuration | Legacy OASIS application accessible at alternate path on same domain |
| 6 | HIGH | Configuration | HSTS max-age only 30 days on portal (vs. 1 year on academic site) |
| 7 | MEDIUM | Missing Protection | No standard Content-Security-Policy header (only legacy IE-specific header) |
| 8 | MEDIUM | Missing Protection | No Permissions-Policy header on OASIS portal |
| 9 | MEDIUM | Dependencies | jQuery 3.5.1 (released 2020) — not the latest version |
| 10 | MEDIUM | Authentication | Seed value for password hashing not cryptographically bound to CSRF token |
| 11 | LOW | Configuration | No robots.txt on OASIS portal |
| 12 | LOW | Dependencies | Cookie naming follows ASP.NET default patterns (informational) |

## Why This Matters

CBSE OASIS is the backbone of India's largest school board's digital infrastructure. Every CBSE-affiliated school — from Kendriya Vidyalayas to private schools across India and abroad — depends on this system for affiliation management, data submission, and regulatory compliance. The data managed includes student enrollment numbers, teacher details, infrastructure information, and financial records.

The **systemic pattern** of running legacy and modern technology stacks side-by-side is common across Indian government portals. The CBSE OASIS password recovery page still runs on ASP.NET Framework while the main application has been migrated to ASP.NET Core — a migration that was likely prioritized for the main workflow but left the recovery flow on the old stack.

Previous analyses in this series:
- [Passport Seva](/blog/passport-seva-security-analysis/) — Blowfish encryption, hardcoded internal IPs in React Native app
- [U-WIN Vaccinator](/blog/uwin-vaccinator-security-analysis/) — hardcoded secret keys in Co-WIN infrastructure
- [ABDM Health ID](/blog/abdm-health-id-security-analysis/) — Firebase exposure in health identity system

## Architecture Notes

The OASIS portal is built on **ASP.NET Core** with:
- Anti-forgery tokens (CSRF protection) ✅
- Secure session cookies (HttpOnly, Secure, SameSite=Strict) ✅
- CAPTCHA on login ✅
- Client-side SHA-256 password hashing with server-provided seed
- IIS 10.0 as the web server
- The password recovery flow runs on **ASP.NET Framework 4.x** at a different path

The main academic site (`cbseacademic.nic.in`) is a separate static site with better security header configuration than the OASIS application itself.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-05-31 | Blog post published (categories only, no exploit details) |
| 2026-06-15 | CERT-In disclosure planned |
| 2026-08-31 | Full 90-day disclosure deadline |

## Recommendations

### Immediate
1. **Migrate password recovery to ASP.NET Core** — Remove the legacy Framework 4.x endpoint; unify the technology stack
2. **Remove version disclosure headers** — Configure IIS to suppress `Server`, `X-Powered-By`, and `X-AspNet-Version` headers
3. **Align security headers across all endpoints** — Ensure every response includes HSTS, CSP, X-Frame-Options, etc.
4. **Extend HSTS max-age to at least 1 year** — Current 30-day duration is insufficient

### Short-term
5. **Strengthen password authentication** — Consider server-side hashing with bcrypt/argon2; current client-side approach makes the hash equivalent to the password
6. **Add standard Content-Security-Policy** — Replace legacy `X-Content-Security-Policy` with modern `Content-Security-Policy`
7. **Update jQuery** — Upgrade to latest version or remove if not needed
8. **Remove or secure the legacy OASIS path** — Either migrate or restrict access

### Structural
9. **Adopt a vulnerability disclosure program** — CBSE should have a public VDP for security researchers
10. **Conduct regular penetration testing** — Annual security audits for a system managing 28,000+ schools
11. **Implement security monitoring** — Log and alert on unusual access patterns (multiple failed logins, bulk data access)

---

*This analysis was performed using publicly accessible web pages and standard HTTP inspection tools. No unauthorized access was attempted. Findings are reported responsibly with a 90-day disclosure timeline.*
