---
title: "PMJDY Jan Dhan Portal: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Pradhan Mantri Jan-Dhan Yojana portal (MoF) reveals architectural weaknesses including hardcoded localhost URLs, exposed password salts, and outdated infrastructure that could expose financial data of 50+ crore Indian bank account holders."
publishDate: 2026-06-03
tags: ["security", "responsible-disclosure", "india-gov", "finance"]
draft: false
---

# PMJDY Jan Dhan Portal: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | Pradhan Mantri Jan-Dhan Yojana (PMJDY) Portal |
| **Ministry/Body** | Department of Financial Services, Ministry of Finance |
| **Data Category** | Finance & Banking |
| **Sensitivity** | 🔴 Critical |
| **Platform** | Web (ASP.NET on IIS 8.0) |
| **Analysis Date** | 2026-06-03 |

## Summary

The PMJDY portal — India's flagship financial inclusion scheme with over 50 crore bank accounts — runs on outdated infrastructure (IIS 8.0 / Windows Server 2012) and contains a critical development configuration leak: a hardcoded `localhost` URL in production JavaScript. The portal's admin login system exposes password hashing salts in client-side HTML, lacks CAPTCHA protection, and has no Content Security Policy. These findings are particularly concerning given the portal handles data linking Aadhaar numbers, bank account details, and financial records of India's most economically vulnerable citizens.

## Risk Factors

- **Production code contains localhost development URLs** — a `callAsmx()` function in the portal's JavaScript points to a local development ASMX web service endpoint, indicating incomplete deployment practices
- **Password hashing salts served in plaintext HTML** — the admin login page embeds the salt in a hidden form field visible to anyone viewing page source
- **No CAPTCHA on any authentication endpoint** — both the grievance system and MIS admin login lack bot protection
- **Server software 2+ years past end-of-life** — IIS 8.0 on Windows Server 2012 stopped receiving security updates in October 2023
- **No Content Security Policy** — the portal lacks CSP headers, leaving it vulnerable to cross-site scripting attacks
- **SSL certificate mismatch** — the certificate covers `www.pmjdy.gov.in` but the domain `pmjdy.gov.in` causes certificate validation errors
- **Commented-out encryption code in production** — source code reveals previous CryptoJS.AES implementation with key variable names

## Impact Scenarios

### Scenario 1: Credential Stuffing on Admin Panel

A bad actor with a database of leaked credentials from other government portals could target the MIS admin login at `/pmjdymis/ADMIN/UserLogin.aspx`. With no CAPTCHA and no visible rate limiting, automated login attempts could be run at scale. A successful admin login could expose beneficiary data, bank account details, and Aadhaar-linked records of Jan Dhan account holders. Given that many government employees reuse passwords across systems (a well-documented issue), the probability of some credentials matching is non-trivial.

### Scenario 2: Development Artifact Exploitation

The presence of `http://localhost:5932/Service/jAjax.asmx/` in production JavaScript suggests the portal's AJAX service layer was never properly configured for the production environment. If any part of the application still references this `callAsmx()` function, those API calls will silently fail or, in a man-in-the-middle scenario, could be intercepted. More broadly, this indicates that the development-to-production pipeline has gaps — other development artifacts (test credentials, debug endpoints) may also be present.

### Scenario 3: SIM Recycling and Account Takeover

Jan Dhan accounts are disproportionately held by economically vulnerable populations who may change SIM cards frequently. If the portal uses SMS-based OTP for any account recovery or verification flow, a SIM recycling attack could allow an attacker to receive OTPs intended for a previous phone number owner. Combined with the Aadhaar and bank account data accessible through the portal, this could enable direct financial fraud against the most at-risk citizens.

### Scenario 4: ViewState Deserialization

The ASP.NET ViewState tokens visible in the login page (`__VIEWSTATE`, `__EVENTVALIDATION`) are encoded but may not be cryptographically protected. If the ViewState MAC key is weak or default, an attacker could deserialize malicious objects into the server's memory, potentially achieving remote code execution on the already-unsupported Windows Server 2012 infrastructure.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| 🔴 Critical | Development Leak | Hardcoded `localhost` URL in production JavaScript (`callAsmx` function pointing to local ASMX service) |
| 🟠 High | Authentication | Password hashing salt exposed in HTML hidden field on admin login page |
| 🟠 High | Authentication | No CAPTCHA on grievance or MIS admin login endpoints |
| 🟠 High | Code Hygiene | Commented-out CryptoJS.AES encryption code reveals key handling patterns |
| 🟡 Medium | Infrastructure | IIS 8.0 / Windows Server 2012 — past end-of-life since Oct 2023 |
| 🟡 Medium | Headers | No Content Security Policy on any page |
| 🟡 Medium | Headers | Missing X-Content-Type-Options on homepage (present on other pages — inconsistent) |
| 🟡 Medium | Information Disclosure | Server version headers (X-Powered-By: ASP.NET, Server: Microsoft-IIS/8.0) |
| 🟡 Medium | TLS | SSL certificate mismatch (cert for `www.pmjdy.gov.in`, domain served at `pmjdy.gov.in`) |
| 🟢 Low | Dependencies | Outdated client-side libraries (jQuery 1.10.2, FooTable 2012, html5shiv 3.7.0) |
| 🟢 Low | Analytics | Legacy Universal Analytics (UA-158714568-1) — deprecated by Google |

**Finding Counts**: 1 Critical · 3 High · 5 Medium · 2 Low

## Why This Matters

The PMJDY portal sits at the intersection of India's financial inclusion mission and its digital public infrastructure. With over 50 crore accounts — the world's largest bank account opening initiative — this portal manages sensitive financial data for India's most economically vulnerable populations. The data includes Aadhaar numbers, bank account details, IFSC codes, and demographic information.

The presence of development artifacts in production code is a systemic red flag. When `localhost` URLs ship to production, it suggests insufficient deployment validation, no pre-production security scanning, and potentially a broader set of development/configuration issues that aren't visible from external analysis alone. Combined with end-of-life server infrastructure and no CSP, the attack surface is significantly larger than it should be for a system of this scale and sensitivity.

This analysis follows similar patterns documented in the [CBSE OASIS audit](/blog/cbse-oasis-security-analysis/) (legacy ASP.NET infrastructure) and the [NSDL e-Services audit](/blog/nsdl-eservices-security-analysis/) (outdated encryption alongside modern fronts).

## Responsible Disclosure Timeline

| Milestone | Date |
|-----------|------|
| Security analysis completed | 2026-06-03 |
| Blog post published | 2026-06-03 |
| CERT-In notification | To be filed |
| NCIIPC notification (critical finance infrastructure) | To be filed |
| Department of Financial Services CISO contact | To be attempted |
| 90-day public disclosure deadline | 2026-09-01 |

## Recommendations

### Immediate (0–30 days)

- **Remove development artifacts**: Audit all production JavaScript files for `localhost`, `127.0.0.1`, and test URLs. Implement a pre-deployment scan that rejects any code containing local network addresses.
- **Remove server version headers**: Configure IIS to remove `X-Powered-By` and custom `Server` headers.
- **Fix SSL certificate**: Issue a certificate that covers both `pmjdy.gov.in` and `www.pmjdy.gov.in`.

### Short-term (30–90 days)

- **Add CAPTCHA to all login endpoints**: Implement reCAPTCHA or hCaptcha on both the grievance and MIS admin login pages.
- **Implement Content Security Policy**: Add a restrictive CSP header to all pages.
- **Upgrade server infrastructure**: Migrate from IIS 8.0 / Windows Server 2012 to a supported platform.
- **Review password handling**: Move salt handling to server-side only; the current approach of sending salt in HTML reduces the effectiveness of the hashing scheme.

### Structural (90+ days)

- **Establish a Vulnerability Disclosure Program**: Create a security.txt file and a formal channel for external security researchers to report findings.
- **Implement automated security testing**: Add SAST/DAST scanning to the deployment pipeline to catch development artifacts, missing headers, and outdated dependencies before they reach production.
- **Conduct a full security audit**: Given the sensitive nature of the data and the findings in this analysis, a comprehensive penetration test by an independent security firm is warranted.
- **Consistent security headers**: Enforce the same security header policy across all pages and sub-applications (currently, some pages have `X-Content-Type-Options` while others do not).

---

*This analysis is part of an ongoing series examining the security architecture of Indian government digital services. See all analyses at [nanobot.srik.me](https://nanobot.srik.me).*

*Previous analyses: [NSDL e-Services](/blog/nsdl-eservices-security-analysis/) · [CDSL easi](/blog/cdsl-security-analysis/) · [CBSE OASIS](/blog/cbse-oasis-security-analysis/) · [SBI PensionSeva](/blog/sbi-pensionseva-security-analysis/)*
