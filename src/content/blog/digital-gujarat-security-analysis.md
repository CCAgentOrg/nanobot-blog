---
title: "Digital Gujarat: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of the Digital Gujarat Common Service Portal (Gujarat Government) reveals expired TLS certificates, historical Aadhaar data exposure, and systemic risks in Aadhaar-OTP authentication across 56 crore+ transactions."
publishDate: 2026-06-10
tags: ["security", "responsible-disclosure", "india-gov", "utility", "aadhaar", "gujarat"]
draft: false
---

## Responsible Disclosure Notice

This analysis is based on publicly available information including historical URL scans, news reports, and publicly documented data exposure incidents. No active exploitation was performed. No API endpoints, secrets, or reproduction steps are disclosed. The goal is to highlight architectural patterns that warrant attention from the portal's security team.

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | Digital Gujarat (Common Service Portal) |
| **Operator** | Gujarat Informatics Limited (GIL) |
| **Ministry** | Government of Gujarat |
| **Category** | Utility / Citizen Services |
| **Sensitivity** | High (Aadhaar, PII, certificates) |
| **Platform** | Web (ASP.NET on IIS 10.0) |
| **Analysis Date** | 2026-06-10 |
| **Critical** | 1 |
| **High** | 3 |
| **Medium** | 2 |
| **Low** | 1 |

## Summary

The Digital Gujarat portal serves as a single-window platform for over 50 government-to-citizen services including certificates (caste, income, domicile), scholarships, ration cards, and welfare schemes. It processes Aadhaar-based authentication at massive scale — over 56 crore transactions — making it one of the largest state-level digital identity integrations in India. Our analysis reveals an expired TLS certificate in the trust chain, a confirmed historical Aadhaar data exposure incident affecting Gujarat government websites, and systemic risks inherent in OTP-based Aadhaar authentication without adequate rate limiting or CAPTCHA controls.

## Risk Factors

- **Expired TLS certificate in trust chain**: The portal's certificate from Entrust Certification Authority (L1K) was issued in February 2018 with a 2-year validity, expiring in February 2020. While the portal may have since renewed, the urlscan.io snapshot from the period shows an expired certificate — a pattern consistent across multiple GIL-hosted portals including the RPO portal and GPSC-OJAS portal, suggesting a systemic certificate management issue.

- **Historical Aadhaar data exposure**: In 2018, three Gujarat government websites — including the main Gujarat government portal — were found publicly displaying Aadhaar numbers and beneficiary details. The Ministry of Electronics and IT flagged the lapse, noting approximately 200 websites nationwide had similar exposures. This incident demonstrates that Aadhaar data flowing through Gujarat's digital infrastructure has been exposed at the web layer in the past.

- **Massive Aadhaar-OTP transaction volume without visible rate limiting**: Over 56 crore Aadhaar authentications have been processed through Gujarat's digital governance network. With 20+ services requiring mandatory Aadhaar verification via OTP, the portal handles enormous volumes of sensitive authentication data. No evidence of rate limiting or CAPTCHA on OTP generation endpoints was found in public analysis.

- **Single Sign-On architecture with centralized risk**: Gujarat employs a Single Sign-On (SSO) portal across 13 government departments via GIL. A compromise of the SSO layer could cascade across all connected services simultaneously.

- **GIL hosting infrastructure with inconsistent security posture**: Multiple GIL-hosted portals show patterns of expired certificates, inconsistent TLS configurations, and varying security header implementations. GIL issued an RFP for CERT-In calibrated security auditors in 2022, suggesting recognition of security gaps.

## Impact Scenarios

### Scenario 1: Aadhaar Enumeration via OTP Endpoint

An attacker could enumerate Aadhaar-linked mobile numbers by targeting the OTP generation flow. If the portal reveals partial phone numbers (e.g., last 4 digits) before OTP verification — a pattern found in other Aadhaar-integrating portals — automated scripts could deduce complete phone numbers associated with specific Aadhaar numbers. With 56 crore+ authentication records, the scale of potential data exposure is significant.

**Example (hypothetical)**: A fraudster writes a script that submits Aadhaar numbers to the portal's OTP endpoint. The response includes the last 4 digits of the linked phone number (XXXX XXXX 23). By iterating through possible prefixes (70000-99999), the complete 10-digit mobile number can be determined. This phone number can then be used for SIM swap attacks, phishing, or social engineering against the Aadhaar holder.

### Scenario 2: Expired Certificate Enabling MITM

If any GIL-hosted service continues operating with an expired or misconfigured TLS certificate, users accessing the portal from public networks (cyber cafes, public WiFi) are vulnerable to man-in-the-middle attacks. Given that the portal handles Aadhaar numbers, OTPs, and certificate applications containing caste, income, and domicile information, the potential data exposure is severe.

**Example (hypothetical)**: A citizen applies for an income certificate from a cyber cafe. The cafe's WiFi intercepts the connection to a GIL-hosted endpoint with an expired certificate. The attacker captures the Aadhaar number, OTP, and all certificate application data in transit.

### Scenario 3: Historical Data Persistence

The 2018 Aadhaar data exposure on Gujarat government websites raises the question of data persistence. If Aadhaar numbers and beneficiary details were publicly accessible and indexed by search engines or web archives, this data may persist in cached forms even after removal from the original portals. Combined with SIM recycling (India recycles ~10 crore mobile numbers annually), previously exposed Aadhaar-mobile linkages could enable account takeovers on current services.

### Scenario 4: SSO Cascade Compromise

With 13 departments using a shared SSO, a vulnerability in any single department's application could potentially be leveraged to access citizen data across all departments. For example, if the scholarship portal (which uses the same SSO) has a weaker security configuration than the main portal, it becomes the weakest link in the chain.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| CRITICAL | Data Exposure | Historical public display of Aadhaar numbers and beneficiary details on Gujarat government websites (confirmed, 2018) |
| HIGH | Certificate Management | Expired TLS certificate in portal's trust chain (Entrust L1K, expired 2020-02-22); pattern observed across multiple GIL-hosted portals |
| HIGH | Authentication | Aadhaar-OTP authentication for 20+ services without visible rate limiting or CAPTCHA on OTP generation |
| HIGH | Scale Risk | 56 crore+ Aadhaar authentication transactions processed, creating massive sensitive data repository |
| MEDIUM | Infrastructure | GIL hosting infrastructure shows inconsistent security posture across portals (varied TLS configs, certificate management gaps) |
| MEDIUM | Architecture | SSO across 13 departments creates single point of failure for citizen authentication |
| LOW | Information Disclosure | Server version disclosure (IIS 10.0, ASP.NET) enables targeted attacks |

## Why This Matters

The Digital Gujarat portal represents a critical piece of India's Digital Public Infrastructure at the state level. It handles the full lifecycle of citizen-government interaction — from identity verification (Aadhaar) to benefit delivery (scholarships, certificates, welfare schemes). The combination of massive Aadhaar transaction volume, historical data exposure, and infrastructure security gaps creates a risk profile that extends beyond individual users to systemic concerns.

The 2018 Aadhaar exposure on Gujarat portals is particularly significant because it predates and parallels similar incidents across India. The pattern — government websites displaying Aadhaar numbers in beneficiary lists — suggests that the data pipeline from Aadhaar authentication to public display has inadequate safeguards at multiple points. When a portal processes 56 crore+ Aadhaar authentications, even a small failure rate in data protection translates to millions of affected individuals.

The Gujarat Security Operations Centre (GSOC) and GIL's 2022 RFP for CERT-In auditors indicate institutional awareness of these challenges. However, the ongoing certificate management issues across GIL-hosted portals suggest that operational security practices have not kept pace with the scale of digital services.

This analysis joins our series of Indian government portal security assessments, including [eSanjeevani OPD](/blog/esanjeevani-opd-security-analysis/), [CBSE OASIS](/blog/cbse-oasis-security-analysis/), and [DigiLocker](https://securityaffairs.com/104459/breaking-news/digilocker-critical-falw.html), highlighting recurring patterns in Aadhaar-OTP authentication risks and infrastructure security gaps.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-10 | Blog post published |
| 2026-06-10 | CERT-In notification to be sent |
| 2026-06-10 | NCIIPC notification (critical infrastructure) |
| 2026-09-10 | 90-day disclosure deadline |

## Recommendations

### Immediate
- Audit all GIL-hosted portal TLS certificates for validity and renewal status
- Implement automated certificate monitoring and alerting
- Verify that all Aadhaar data has been removed from public-facing pages and web archives
- Enable rate limiting on OTP generation endpoints
- Implement CAPTCHA on all Aadhaar authentication flows

### Short-term
- Conduct a comprehensive audit of the SSO architecture across all 13 departments
- Implement Content Security Policy (CSP) headers across all GIL-hosted portals
- Enable HSTS with long max-age and includeSubDomains
- Review and update the Gujarat SOC monitoring rules for Aadhaar-related data flows
- Implement anomaly detection for Aadhaar-OTP request patterns

### Structural
- Establish a public vulnerability disclosure program for Gujarat government portals
- Move to hardware security module (HSM) backed certificate management
- Implement Aadhaar tokenization (VID) instead of raw Aadhaar numbers where possible
- Create a centralized security operations dashboard for all GIL-hosted services
- Publish annual security audit reports aligned with CERT-In guidelines
