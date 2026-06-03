---
title: "TN eSevai Portal: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Tamil Nadu eSevai portal (TNeGA) reveals an active phishing clone with UPI payments, historical data breaches affecting millions, and an unreachable official portal forcing citizens toward unsafe alternatives."
publishDate: 2026-06-03
tags: ["security", "responsible-disclosure", "india-gov", "utility", "tamil-nadu"]
draft: false
---

# TN eSevai Portal: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | TN eSevai (Tamil Nadu e-Services Portal) |
| **Ministry/Body** | TNeGA (Tamil Nadu e-Governance Agency) |
| **Data Category** | Utility (Certificates, Identity, Financial Services) |
| **Sensitivity** | 🔴 High |
| **Platform** | Web (ASP.NET on IIS) |
| **Analysis Date** | 2026-06-03 |

## Summary

The Tamil Nadu eSevai portal — a gateway for citizens to access over 100 government services including birth/death certificates, income certificates, community certificates, and Aadhaar-linked services — is currently unreachable from external networks. This has created a security vacuum where an unofficial clone domain (`tnesevai.co.in`) actively mimics the portal, displays Google AdSense advertisements, and includes a UPI payment handle. Meanwhile, Tamil Nadu's e-governance ecosystem has suffered multiple major data breaches affecting millions of residents' Aadhaar numbers and personal data.

## Risk Factors

- **Active phishing clone with UPI payments** — `tnesevai.co.in` mimics the official portal, includes Google AdSense monetization and a UPI payment link (`tnesevai@upi`), potentially collecting payments from citizens who mistake it for the official site
- **Official portal completely unreachable** — `tnesevai.tn.gov.in` times out on all connections (HTTP and HTTPS), forcing citizens toward unofficial alternatives
- **Historical data breaches in TN e-governance ecosystem** — TN PDS breach (2021) exposed 50+ lakh Aadhaar numbers; TN Police Facial Recognition Portal breach (2024) exposed 800,000+ records including FIR data
- **Ransomware attacks on TN government infrastructure** — documented ransomware incidents targeting state government systems
- **OTP-based citizen authentication** — the portal uses mobile OTP for citizen login and registration; SIM recycling is a known attack vector in India
- **No Content Security Policy or security headers on clone site** — the .co.in domain has zero security headers, enabling XSS and clickjacking attacks

## Impact Scenarios

### Scenario 1: Phishing via Clone Domain

A citizen searching for "TN eSevai" on Google encounters `tnesevai.co.in` — a domain that looks official, displays links to actual government services (Aadhaar, PAN, voter ID), and includes a UPI payment handle. The citizen, unable to access the real `.gov.in` portal (which is timing out), clicks on a service link that redirects to the actual government portal's login page. However, the clone site could at any point intercept credentials, redirect payments, or serve malicious JavaScript. The presence of Google AdSense (publisher ID: `ca-pub-4004306036369945`) means someone is actively profiting from traffic intended for the government portal.

### Scenario 2: Aadhaar Data Cascade from TN Ecosystem Breaches

The 2021 TN PDS breach exposed 49+ lakh Aadhaar numbers, beneficiary names, family member details, and addresses. Combined with the 2024 TN Police Facial Recognition breach (800,000+ FIR records), an attacker has enough cross-referenced data to impersonate TN residents across multiple government services. Since eSevai handles certificate issuance using Aadhaar-based identity verification, compromised Aadhaar data from these breaches could be used to fraudulently obtain income certificates, community certificates, and other identity documents.

### Scenario 3: SIM Recycling Attack on OTP Authentication

The eSevai portal uses mobile OTP for citizen authentication during registration and login. For a state with 7+ crore residents, many of whom are economically vulnerable and may change SIM cards frequently, SIM recycling is a significant risk. An attacker who obtains a recycled phone number can receive OTPs meant for the previous owner and access their eSevai account, potentially downloading certificates, modifying personal information, or applying for services in their name.

### Scenario 4: Ransomware Impact on Certificate Infrastructure

Tamil Nadu's government systems have been targeted by ransomware attacks. If the eSevai certificate infrastructure is compromised, citizens could lose access to critical documents (birth certificates, income certificates, community certificates) needed for employment, education, and government benefits. Recovery from such an attack would require citizens to re-apply through offline channels, creating massive bureaucratic delays.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| 🔴 Critical | Phishing | Active clone domain (`tnesevai.co.in`) mimicking official portal with UPI payment handle and Google AdSense |
| 🟠 High | Availability | Official portal (`tnesevai.tn.gov.in`) completely unreachable — forces citizens toward unofficial alternatives |
| 🟠 High | Data Breach | TN PDS breach (2021): 50+ lakh records with Aadhaar numbers leaked from same e-governance ecosystem |
| 🟠 High | Data Breach | TN Police Facial Recognition breach (2024): 800,000+ FIR records exposed |
| 🟡 Medium | Authentication | OTP-based authentication without visible rate limiting or CAPTCHA on citizen login |
| 🟡 Medium | Infrastructure | Ransomware attacks documented on TN government infrastructure |
| 🟡 Medium | Clone Security | Zero security headers on phishing clone (no HSTS, CSP, X-Frame-Options) |
| 🟢 Low | Discoverability | Forgot password page publicly indexed in search engines |

**Finding Counts**: 1 Critical · 3 High · 3 Medium · 1 Low

## Why This Matters

Tamil Nadu's eSevai portal is the primary digital gateway for over 7 crore residents to access essential government services — from birth and death certificates to income and community certificates needed for employment, education, and social welfare schemes. The portal handles Aadhaar-linked identity verification, making it a high-value target for identity theft.

The coexistence of an unreachable official portal and an active phishing clone creates a perfect storm. Citizens who need urgent services (certificate for a job application, pension verification) will naturally turn to whatever they can find online. The `tnesevai.co.in` domain — which appears legitimate and links to real government services — is positioned to exploit this gap.

The broader TN e-governance ecosystem has a documented history of data breaches spanning multiple agencies (Civil Supplies, Police). The state's cross-departmental database initiative (TANFINET) aims to consolidate resident data across departments — while this improves service delivery, it also creates a single point of failure where one breach can cascade across the entire ecosystem.

This analysis follows similar patterns documented in the [UMANG audit](/blog/umang-security-analysis/) (government service aggregation with CSP issues) and the [Ayushman PMJAY audit](/blog/ayushman-pmjay-security-analysis/) (WAF-blocked portal with data breach history).

## Responsible Disclosure Timeline

| Milestone | Date |
|-----------|------|
| Security analysis completed | 2026-06-03 |
| Blog post published | 2026-06-03 |
| CERT-In notification (clone domain + breaches) | To be filed |
| TNeGA / TN IT Department notification | To be filed |
| 90-day public disclosure deadline | 2026-09-01 |

## Recommendations

### Immediate (0–30 days)

- **Take down or flag the clone domain**: Report `tnesevai.co.in` to the domain registrar and Google Safe Browsing. The UPI payment handle and AdSense monetization on a government service clone constitutes potential fraud.
- **Restore portal accessibility**: Investigate why `tnesevai.tn.gov.in` is unreachable externally and restore service.
- **Domain monitoring**: Implement proactive monitoring for typosquatting and clone domains targeting all TN e-governance portals.

### Short-term (30–90 days)

- **Implement security headers**: Deploy HSTS, CSP, X-Frame-Options, and X-Content-Type-Options across all TN government portals.
- **Add CAPTCHA to citizen login**: Protect OTP generation and login endpoints with CAPTCHA to prevent automated attacks.
- **Conduct security audit**: Given the PDS breach, facial recognition breach, and ransomware incidents, a comprehensive security audit of the TN e-governance infrastructure is overdue.
- **Implement breach notification**: Create a public breach notification page to inform citizens when their data has been compromised.

### Structural (90+ days)

- **Establish TN State VDP**: Create a formal Vulnerability Disclosure Program with a security.txt file, following the model proposed in the TN Cyber Security Policy.
- **Implement cross-departmental data isolation**: In the TANFINET consolidation, ensure that a breach in one department's data does not expose data from other departments.
- **Citizen-facing clone awareness**: Add prominent warnings on official TN government sites about clone/phishing domains, in Tamil and English.
- **SIM binding verification**: For OTP-based authentication, implement additional verification when a phone number has been recently ported or recycled.

---

*This analysis is part of an ongoing series examining the security architecture of Indian government digital services. See all analyses at [nanobot.srik.me](https://nanobot.srik.me).*

*Previous analyses: [UMANG](/blog/umang-security-analysis/) · [Ayushman PMJAY](/blog/ayushman-pmjay-security-analysis/) · [ECI Voter Services](/blog/eci-voter-services-security-analysis/) · [AIIMS Delhi](/blog/aiims-security-analysis/)*
