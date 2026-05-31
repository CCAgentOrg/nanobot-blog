---
title: "EPFO UAN Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of EPFO UAN (MoL&E) reveals architectural weaknesses in client-side data protection, authentication, and API security that could expose Financial & Tax Data of Indian citizens."
publishDate: 2026-05-31
tags: ["security", "responsible-disclosure", "india-gov", "finance"]
draft: false
---

# EPFO UAN: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | EPFO UAN |
| **Ministry/Body** | MoL&E |
| **Data Category** | Financial & Tax Data |
| **Sensitivity** | 🔴 Critical |
| **Platform** | web |
| **Analysis Date** | 2026-05-31 |
| **Critical Findings** | 0 |
| **High Findings** | 0 |
| **Medium Findings** | 1 |
| **Low Findings** | 0 |

## Summary

This analysis examined the client-side architecture of **EPFO UAN**, operated by **MoL&E**, which handles **financial & tax data** — classified as **critical** sensitivity under our data risk framework.

The analysis identified **1 categories** of architectural concerns, with **0 critical**, **0 high**, **1 medium**, and **0 low** severity findings.

## Risk Factors

- No CAPTCHA on OTP generation — vulnerable to automated enumeration and SMS bombing
- No certificate pinning for high-sensitivity data — MITM attacks possible

## Impact Scenarios


### Scenario: Automated Enumeration

Without CAPTCHA or rate limiting on OTP endpoints, an attacker can programmatically trigger OTPs across millions of phone numbers to discover which ones are registered, map the user base, and potentially intercept OTPs at scale through SS7 vulnerabilities or compromised telecom infrastructure.


### Scenario: Man-in-the-Middle on Public WiFi

Without certificate pinning, a user on public WiFi or a compromised network can have their session intercepted. For health or financial data, this means an attacker on the same network could read vaccination records, bank details, or identity documents in transit.


### Scenario: Financial Fraud Vector

Access to tax returns, bank account details, or provident fund data enables targeted phishing, identity theft, and direct financial fraud. Combined with hardcoded API secrets, this could allow automated large-scale data harvesting.


## Findings Overview

| Severity | Category | Matches |
|----------|----------|---------|
| 🔵 LOW | Basic Scan | 0 |

*Specific details omitted per responsible disclosure practices.*

## Why This Matters

India's Digital Public Infrastructure (DPI) — Aadhaar, UPI, Co-WIN, U-WIN, DigiLocker — is built on a model of scale and inclusion. But inclusion without protection is a trap. When the same mobile number that receives OTPs for a vaccination certificate also receives OTPs for banking, taxation, and identity verification, the security of the weakest link becomes the security of the entire chain.

The [CBSE data breach incident (2026)](https://www.thehindu.com/education/cbse-data-breach/) demonstrated that traditional disclosure routes — CERT-In reports, ministry emails — do not produce timely fixes. The researcher who found the vulnerabilities waited months, only to be met with denial and inaction. Public pressure, parliamentary questions, and media coverage eventually forced acknowledgment.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-05-31 | Blog post published (impact only, no exploit details) |
| Pending | CERT-In report filed |
| Pending | NCIIPC notification (if critical infrastructure) |
| Pending | Direct contact with ministry IT / CISO |
| 2026-05-31 + 90 days | Full public disclosure deadline |

## Recommendations

### Immediate (0-7 days)
- Rotate any hardcoded secrets and move them server-side
- Implement server-side OTP verification with CAPTCHA and rate limiting
- Enable certificate pinning for apps handling health/financial data

### Short-term (1-4 weeks)
- Add secondary identity verification (ABHA/Aadhaar) for accessing sensitive records
- Implement proper server-side encryption instead of client-side obfuscation
- Remove sensitive data from device-local storage

### Structural (1-3 months)
- Adopt a public vulnerability disclosure program (VDP)
- Implement continuous security testing in CI/CD
- Engage independent security auditors for annual assessments
- Align with DPDP Act 2023 requirements for sensitive personal data

---

*This analysis is part of an ongoing audit of Indian government digital services. See [the project page](/blog/tag/security/) for other analyses.*
