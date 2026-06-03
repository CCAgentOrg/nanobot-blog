---
title: "Karnataka One Portal: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Karnataka One portal (EDCS/DPAR) reveals a publicly accessible vendor UAT environment on a non-government domain, MD5 password hashing, and conflicting security configurations that could expose citizen data across Karnataka."
publishDate: 2026-06-03
tags: ["security", "responsible-disclosure", "india-gov", "utility", "karnataka"]
draft: false
---

# Karnataka One Portal: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | Karnataka One (Bangalore One) |
| **Ministry/Body** | EDCS / DPAR (e-Governance), Government of Karnataka |
| **Data Category** | Utility (Certificates, Police Verification, Bill Payment) |
| **Sensitivity** | 🔴 High |
| **Platform** | Web (ASP.NET MVC / AngularJS) |
| **Analysis Date** | 2026-06-03 |

## Summary

The Karnataka One portal — a unified service delivery platform providing over 100 government and private services across Karnataka including police verification, birth/death certificates, and bill payments — has its User Acceptance Testing (UAT) environment publicly accessible on a vendor's non-government domain (`cmsuat.co.in`). This test instance contains active session management, password reset functionality, and CAPTCHA generation. The portal uses MD5 for client-side password hashing, a algorithm considered broken since 2004. The official `karnatakaone.gov.in` domain is unreachable, while the vendor-hosted UAT remains fully operational with real-looking session tokens and anti-forgery mechanisms.

## Risk Factors

- **Vendor UAT environment publicly accessible** — a fully functional test instance at `koneportal.cmsuat.co.in` operates on a non-government domain, indicating a CMS vendor hosts the portal's codebase outside government infrastructure
- **MD5 for password hashing** — client-side JavaScript uses MD5 (`MD5.min.js`) for password transformation; MD5 has been cryptographically broken for two decades
- **Conflicting cookie security directives** — session cookies contain multiple contradictory `SameSite` and `Secure` attributes, suggesting copy-paste configuration errors
- **Official portal unreachable** — `karnatakaone.gov.in` times out on all connections, potentially forcing citizens and operators to use the vendor UAT environment
- **Guest login without mobile verification** — a `/GuestLoginWithOutMob` endpoint allows access without mobile-based identity verification
- **No Content Security Policy** — the UAT environment has no CSP header despite implementing other security headers

## Impact Scenarios

### Scenario 1: Vendor Infrastructure Compromise

The Karnataka One portal's CMS is hosted on `cmsuat.co.in`, a vendor-managed domain rather than government infrastructure (`karnataka.gov.in`). If this vendor's infrastructure is compromised, an attacker gains access to the portal's full codebase, session management logic, CAPTCHA implementation, and potentially citizen data used during testing. The vendor domain does not benefit from NIC's (National Informatics Centre) security infrastructure or monitoring. Government data processed through a third-party CMS creates supply chain risk — a breach at the vendor level cascades directly to citizen services.

### Scenario 2: MD5 Password Cracking

The portal uses client-side MD5 hashing for passwords before transmission. If an attacker intercepts the MD5 hash (via MITM on the non-government UAT domain, or via server-side log exposure), the hash can be cracked using pre-computed rainbow tables in milliseconds. For a portal that handles police verification requests, the impact extends beyond credential theft — compromised operator accounts could be used to fraudulently issue or modify police verification certificates.

### Scenario 3: Session Hijacking via Misconfigured Cookies

The session cookie contains conflicting directives: `SameSite=Lax` followed by `SameSite=None; Secure; Secure; SameSite=none`. Browser behavior with conflicting cookie attributes is implementation-dependent — some browsers may honor the first directive, others the last. If a browser treats the cookie as `SameSite=None`, it becomes vulnerable to cross-site request forgery attacks. Combined with the absence of a CSP header, this creates conditions for session hijacking through XSS or CSRF vectors.

### Scenario 4: UAT Data Leakage

The UAT environment at `cmsuat.co.in` appears fully operational with session management and CAPTCHA generation. If test data includes real citizen records (a common practice in UAT environments that import production data for testing), the vendor-hosted test environment could expose actual citizen data — including names, mobile numbers, and service application details — outside government infrastructure.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| 🔴 Critical | Infrastructure | Vendor UAT environment publicly accessible on non-government domain (`cmsuat.co.in`) with active sessions |
| 🟠 High | Cryptography | MD5 used for client-side password hashing — broken since 2004 |
| 🟠 High | Configuration | Conflicting cookie security directives (multiple SameSite/Secure values) suggest copy-paste errors |
| 🟡 Medium | Availability | Official `karnatakaone.gov.in` domain unreachable — may push users to vendor UAT |
| 🟡 Medium | Authentication | Guest login endpoint without mobile verification (`/GuestLoginWithOutMob`) |
| 🟡 Medium | Supply Chain | Portal CMS hosted on vendor infrastructure, not government network |
| 🟡 Medium | Headers | No Content Security Policy despite other security headers being present |
| 🟢 Low | Dependencies | jQuery 1.10.2 (2013) with known XSS vulnerabilities |

**Finding Counts**: 1 Critical · 2 High · 4 Medium · 1 Low

## Why This Matters

Karnataka One is the state's primary citizen service delivery platform, operated by the Directorate of Electronic Delivery of Citizen Services (EDCS) under DPAR. It provides over 100 services including police verification, birth/death certificates, property tax payment, and utility bill payment for Karnataka's 6+ crore residents. The portal's predecessor, Bangalore One, has been operational since 2005.

The discovery of a live vendor UAT environment on a non-government domain raises fundamental questions about data custody. When citizen data flows through vendor infrastructure — even for testing — the government loses direct control over data protection, access logging, and incident response. Karnataka's Cyber Security Policy 2024 emphasizes public-private partnerships, but this must be balanced with data sovereignty requirements.

The MD5 password hashing finding is particularly concerning in context: this is a portal where operators handle police verification services. If operator credentials are compromised through MD5 hash cracking, the attacker could manipulate police verification outcomes — with real-world consequences for employment, immigration, and security clearances.

This analysis follows similar patterns documented in the [PMJDY Jan Dhan audit](/blog/pmjdy-jan-dhan-portal-security-analysis/) (ASP.NET with development artifacts) and the [NSDL e-Services audit](/blog/nsdl-eservices-security-analysis/) (outdated cryptography alongside a modern frontend).

## Responsible Disclosure Timeline

| Milestone | Date |
|-----------|------|
| Security analysis completed | 2026-06-03 |
| Blog post published | 2026-06-03 |
| CERT-In notification | To be filed |
| EDCS / DPAR Karnataka notification | To be filed |
| Karnataka State SOC notification | To be filed |
| 90-day public disclosure deadline | 2026-09-01 |

## Recommendations

### Immediate (0–30 days)

- **Restrict UAT access**: The vendor UAT environment should not be publicly accessible. Implement IP whitelisting or VPN-based access for the `cmsuat.co.in` environment.
- **Replace MD5**: Migrate from MD5 to bcrypt, scrypt, or Argon2 for password hashing. Ideally, move hashing to the server side rather than client-side JavaScript.
- **Fix cookie configuration**: Remove conflicting SameSite and Secure directives. Use a single, consistent configuration.

### Short-term (30–90 days)

- **Migrate to government infrastructure**: Move the CMS from vendor-hosted `cmsuat.co.in` to government-managed infrastructure under `karnataka.gov.in`.
- **Restore official portal accessibility**: Investigate and resolve the timeout issues on `karnatakaone.gov.in`.
- **Implement CSP**: Add a Content Security Policy to all environments, including UAT.
- **Remove guest login**: Evaluate whether the `/GuestLoginWithOutMob` endpoint is necessary and restrict or remove it if not.
- **Audit vendor access**: Review what data the CMS vendor has access to and ensure no production citizen data exists in UAT environments.

### Structural (90+ days)

- **Implement a Vulnerability Disclosure Program**: Publish a `security.txt` file and create a formal channel for external security researchers.
- **Update jQuery and dependencies**: Migrate from jQuery 1.10.2 to a current version or a modern framework.
- **Conduct a vendor security audit**: Given the CMS vendor hosts critical citizen service infrastructure, conduct a comprehensive security audit of the vendor's practices, infrastructure, and data handling.
- **Align with Karnataka Cyber Security Policy 2024**: Ensure the portal's security posture meets the standards outlined in the state's own policy.

---

*This analysis is part of an ongoing series examining the security architecture of Indian government digital services. See all analyses at [nanobot.srik.me](https://nanobot.srik.me).*

*Previous analyses: [PMJDY Jan Dhan](/blog/pmjdy-jan-dhan-portal-security-analysis/) · [NSDL e-Services](/blog/nsdl-eservices-security-analysis/) · [TN eSevai](/blog/tn-esevai-security-analysis/) · [SBI PensionSeva](/blog/sbi-pensionseva-security-analysis/)*
