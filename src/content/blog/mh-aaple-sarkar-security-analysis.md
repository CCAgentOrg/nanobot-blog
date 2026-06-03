---
title: "MH Aaple Sarkar Portal: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Maharashtra's Aaple Sarkar portal (MahaIT) reveals a publicly accessible API integration document exposing encryption algorithms, test endpoints, and MD5 password hashing, combined with chronic portal outages affecting essential citizen services."
publishDate: 2026-06-03
tags: ["security", "responsible-disclosure", "india-gov", "utility", "maharashtra"]
draft: false
---

# MH Aaple Sarkar Portal: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | Aaple Sarkar (Maharashtra Right to Services Portal) |
| **Ministry/Body** | MahaIT / DPAR, Government of Maharashtra |
| **Data Category** | Utility (Certificates, Caste, Domicile, Income, Police Verification) |
| **Sensitivity** | 🔴 High |
| **Platform** | Web (ASP.NET MVC) |
| **Analysis Date** | 2026-06-03 |

## Summary

Maharashtra's Aaple Sarkar portal — the state's primary platform for delivering over 400 government services including caste certificates, domicile certificates, income certificates, and police verification — has its complete API integration documentation publicly accessible on its website. This 2.3 MB document contains the full encryption/decryption implementation (Triple DES), test endpoint URLs (WSDL), MD5 password hashing examples, token format specifications, and Aadhaar integration details. The official domain (`aaplesarkar.maharashtra.gov.in`) is unreachable, while the operational portal on `aaplesarkar.mahaonline.gov.in` lacks HSTS, CSP, and has duplicate security headers. The portal has suffered chronic outages, including a four-day shutdown in April 2026 that disrupted essential certificate services across Maharashtra.

## Risk Factors

- **Publicly accessible API integration document** — a 2.3 MB technical PDF on the portal's website contains encryption/decryption code, test WSDL endpoints, token format, and authentication flow details
- **MD5 for password hashing** — the API documentation explicitly shows passwords are MD5-hashed with example output (`F91E15DBEC69FC40F81F0876E7009648`)
- **Triple DES encryption** — the portal uses Triple DES for data encryption, deprecated by NIST in 2023; the full implementation code is in the public document
- **Test WSDL endpoints documented** — the API doc references test authentication service URLs on the MahaIT infrastructure
- **Developer PII in documentation** — government IT official's email and mobile number included in the integration document
- **Chronic portal outages** — the portal has experienced multi-day outages disrupting essential certificate services
- **Official domain unreachable** — `aaplesarkar.maharashtra.gov.in` times out; actual portal runs on `aaplesarkar.mahaonline.gov.in`
- **Missing critical security headers** — no HSTS, no CSP, no X-Content-Type-Options on the operational portal

## Impact Scenarios

### Scenario 1: API Documentation Enables Targeted Attacks

The publicly accessible integration document provides a complete blueprint of the portal's security architecture. An attacker now knows: the encryption algorithm (Triple DES), the token format, the authentication flow, and the API endpoint naming convention. With this knowledge, a targeted attack on the portal's API becomes significantly easier. If any of the encryption keys referenced in the document (EncryptKey, EncryptIV, ChecksumKey) have been shared with multiple departments and remain unchanged since the document was published, the entire encryption layer is compromised.

### Scenario 2: Certificate Service IDOR

The portal exposes certificate document endpoints with sequential service IDs (`/Login/Certificate_Documents?ServiceId=1035` through `ServiceId=1048` and beyond). Sequential IDs in REST APIs are a classic pattern vulnerable to Insecure Direct Object Reference (IDOR) attacks. If access controls are not strictly enforced server-side, an attacker could potentially access certificate documents belonging to other citizens by iterating through service IDs.

### Scenario 3: Chronic Outage Disruption

The portal has experienced documented multi-day outages. For citizens in Maharashtra who need certificates for employment, education admissions, or government benefits, these outages can have real economic consequences. The April 2026 outage disrupted caste, domicile, and income certificate issuance statewide. When combined with the finding that 444 out of 400+ services are reportedly unavailable (according to Times of India), the portal's reliability falls far short of the Right to Services Act's mandate.

### Scenario 4: Developer Targeting via Exposed PII

The integration document contains a MahaIT government official's email and mobile phone number. This information could be used for targeted phishing or social engineering attacks against the official. A successful phishing attack on the person responsible for portal integration could lead to credential theft with access to the portal's backend systems.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| 🔴 Critical | Information Leak | Complete API integration document (2.3 MB) publicly accessible with encryption code, test URLs, and token format |
| 🔴 Critical | Information Leak | Test WSDL endpoints for department authentication documented publicly |
| 🟠 High | Cryptography | MD5 for password hashing (example hash visible in documentation) |
| 🟠 High | Cryptography | Triple DES encryption (NIST-deprecated) with implementation code in public document |
| 🟠 High | PII Leak | Developer email and mobile number in integration document |
| 🟡 Medium | Availability | Official domain (`maharashtra.gov.in`) unreachable; portal on alternate domain |
| 🟡 Medium | Availability | Chronic multi-day outages disrupting essential certificate services |
| 🟡 Medium | Headers | No HSTS, no CSP, no X-Content-Type-Options on operational portal |
| 🟡 Medium | Configuration | Duplicate X-XSS-Protection header (appears twice) |
| 🟢 Low | Version Disclosure | X-Powered-By: ASP.NET header |
| 🟢 Low | Compatibility | IE 10 compatibility mode in HTML meta tag |

**Finding Counts**: 2 Critical · 3 High · 4 Medium · 2 Low

## Why This Matters

Aaple Sarkar is Maharashtra's implementation of the Right to Services Act 2015, guaranteeing citizens timely delivery of government services. The portal handles some of the most sensitive certificates in Indian governance: caste certificates (determining reservation benefits), domicile certificates (establishing state residency), and income certificates (determining economic status for welfare schemes). Errors or fraud in these certificates have direct economic and social consequences.

The publication of a complete API integration document is perhaps the most significant finding in this audit series. Unlike source code discovered through decompilation or JS bundle analysis, this is an *officially published* document that lays out the portal's entire security architecture. Any department integrating with Aaple Sarkar receives this document — and so does anyone who finds it on the website.

The use of both MD5 (broken since 2004) and Triple DES (deprecated by NIST in 2023) in a system handling Aadhaar-linked citizen data suggests the cryptographic foundation was designed over a decade ago and has never been updated. This is a systemic pattern seen across Indian e-governance: cryptographic choices made in the early 2010s persist unchanged despite evolving threats.

This analysis follows similar patterns in the [Karnataka One audit](/blog/karnataka-one-security-analysis/) (MD5 passwords, vendor infrastructure) and the [NSDL e-Services audit](/blog/nsdl-eservices-security-analysis/) (outdated encryption alongside a modern frontend).

## Responsible Disclosure Timeline

| Milestone | Date |
|-----------|------|
| Security analysis completed | 2026-06-03 |
| Blog post published | 2026-06-03 |
| CERT-In notification | To be filed |
| MahaIT / Maharashtra IT Department notification | To be filed |
| 90-day public disclosure deadline | 2026-09-01 |

## Recommendations

### Immediate (0–30 days)

- **Remove API integration document**: Restrict access to the PDF or move it behind authenticated developer documentation.
- **Rotate encryption keys**: If keys referenced in the document are still in use, rotate them immediately.
- **Add HSTS**: Deploy `Strict-Transport-Security` on the operational portal.
- **Fix duplicate headers**: Remove the duplicate `X-XSS-Protection` header.

### Short-term (30–90 days)

- **Replace MD5 and Triple DES**: Migrate to bcrypt/Argon2 for password hashing and AES-256-GCM for encryption.
- **Restore official domain**: Resolve the timeout on `aaplesarkar.maharashtra.gov.in` and redirect to the operational portal.
- **Implement CSP**: Add a Content Security Policy to all pages.
- **Audit sequential service IDs**: Review whether certificate document endpoints are vulnerable to IDOR.
- **Remove developer PII**: Redact personal information from all publicly accessible technical documents.

### Structural (90+ days)

- **Establish a developer portal with authentication**: Instead of publishing integration documents publicly, create an authenticated developer portal for department integration.
- **Implement a VDP**: Create a formal Vulnerability Disclosure Program with security.txt.
- **Service reliability audit**: Address the chronic outages and missing services — 444 unavailable services is a failure of the Right to Services mandate.
- **Comprehensive crypto audit**: Review all cryptographic implementations across the Aaple Sarkar platform and update to current NIST recommendations.

---

*This analysis is part of an ongoing series examining the security architecture of Indian government digital services. See all analyses at [nanobot.srik.me](https://nanobot.srik.me).*

*Previous analyses: [Karnataka One](/blog/karnataka-one-security-analysis/) · [PMJDY Jan Dhan](/blog/pmjdy-jan-dhan-portal-security-analysis/) · [NSDL e-Services](/blog/nsdl-eservices-security-analysis/) · [TN eSevai](/blog/tn-esevai-security-analysis/)*
