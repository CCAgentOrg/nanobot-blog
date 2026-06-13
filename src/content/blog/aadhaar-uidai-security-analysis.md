---
title: "Aadhaar (UIDAI): Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Aadhaar/UIDAI (MeitY) reveals CSP misconfigurations on the central identity portal, a history of critical data breaches affecting 815M+ records, and architectural concerns in the world's largest biometric identity system."
publishDate: 2026-06-13
tags: ["security", "responsible-disclosure", "india-gov", "identity"]
draft: false
---

# Aadhaar (UIDAI): Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Historical breach data is sourced from publicly reported incidents. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | Aadhaar (UIDAI) |
| **Ministry/Body** | MeitY |
| **Data Category** | Identity & Biometrics |
| **Sensitivity** | 🔴 Critical |
| **Platform** | Web (uidai.gov.in) + mAadhaar App |
| **Analysis Date** | 2026-06-13 |
| **Critical Findings** | 2 |
| **High Findings** | 3 |
| **Medium Findings** | 2 |
| **Low Findings** | 1 |

## Summary

This analysis examined the client-side architecture of **Aadhaar**, operated by the **Unique Identification Authority of India (UIDAI)** under **MeitY** — the world's largest biometric identity system covering over 1.4 billion residents. The system handles **identity, biometrics (fingerprints, iris, facial), and demographic data** — classified as **critical** sensitivity.

The analysis combined live header and CSP analysis of uidai.gov.in with publicly documented security incidents. It identified **2 critical**, **3 high**, **2 medium**, and **1 low** severity findings, including a permissive CSP allowing third-party script execution on the central identity portal, and a well-documented history of data breaches affecting over 815 million records.

## Risk Factors

- Permissive Content Security Policy with `unsafe-inline` and `unsafe-eval` on the central identity portal
- Third-party social media scripts (Twitter, Facebook) permitted on government identity infrastructure
- Historical insider-mediated breach (2018) where full Aadhaar access was sold for ₹500
- 815 million records reportedly sold on dark web marketplaces
- mAadhaar app previously rated 0/10 for security by independent researchers
- Misconfigured government domains exposing Aadhaar documents (2025 disclosure)
- Referrer-Policy set to `unsafe-url`, leaking full URL paths to third-party embeds

## Impact Scenarios

### Scenario: Supply Chain Compromise via Third-Party Scripts

The uidai.gov.in CSP explicitly allows scripts from social media CDN domains and the Facebook SDK. If any of these third-party CDN domains were compromised — as has happened with multiple CDNs historically — the attacker would have code execution context on India's central identity portal. For a system holding biometric data on 1.4 billion people, the blast radius of a CDN supply chain attack is unprecedented.

### Scenario: Insider-Mediated Data Access (Documented, 2018)

This is not hypothetical — it happened. In January 2018, a major Indian newspaper reported that former UIDAI-enrolled agents were selling access to the entire Aadhaar database for ₹500 per query. For an additional ₹300, anyone could print Aadhaar cards. The breach was enabled by compromised credentials of village-level enterprise (VLE) operators. A user ID and password allowed unrestricted access to any resident's Aadhaar details including name, address, postal code, photo, phone, and email.

### Scenario: Dark Web Data Correlation (Ongoing)

Reports indicate that 815 million Aadhaar-linked records — including names, phone numbers, addresses, and Aadhaar numbers — have been offered for sale on dark web forums. When combined with other breached databases (voter rolls, bank records, COVID vaccination data), this enables comprehensive identity reconstruction of Indian citizens. Unlike passwords, biometric data cannot be reset.

### Scenario: Referrer Leakage on Identity Portal

The `Referrer-Policy: unsafe-url` setting on uidai.gov.in means that when a user navigates from an Aadhaar service page to any external link (including social media embeds), the full URL — which may contain session identifiers, service parameters, or personal data references — is sent to the destination server. For a portal handling identity verification requests, this creates a data leakage channel.

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| 🔴 CRITICAL | Historical Breach — Insider Access | 2018 breach: Full database accessible for ₹500 via compromised VLE credentials |
| 🔴 CRITICAL | Historical Breach — Dark Web | 815M+ records reportedly sold on dark web; identity data non-resettable |
| 🟠 HIGH | CSP Misconfiguration | `unsafe-inline` + `unsafe-eval` in script-src on central identity portal |
| 🟠 HIGH | Third-Party Script Exposure | Social media CDN and Facebook SDK permitted in CSP script-src |
| 🟠 HIGH | Domain Misconfiguration | Aadhaar documents exposed via misconfigured government domains (2025 disclosure) |
| 🟡 MEDIUM | Referrer Policy | `unsafe-url` leaks full URL paths to all third-party embeds |
| 🟡 MEDIUM | mAadhaar Historical Vulnerabilities | App rated 0/10 for security; SSL MITM, hardcoded keys found (pre-2026) |
| 🔵 LOW | Deprecated Headers | X-XSS-Protection header present (deprecated per MDN) |

## Why This Matters

Aadhaar is the foundational identity layer of India's Digital Public Infrastructure (DPI). It underpins:

- **Direct Benefit Transfer (DBT)** — ₹24+ lakh crore transferred to bank accounts
- **DigiLocker** — 300M+ users storing identity documents
- **UPI** — 13+ billion monthly transactions authenticated via Aadhaar-linked phones
- **Telecom** — 1+ billion SIM cards verified through Aadhaar eKYC
- **Taxation** — PAN-Aadhaar linking mandated for all taxpayers

A security weakness in Aadhaar doesn't affect one service — it cascades across India's entire digital economy. The biometric nature of the data makes breaches permanent: fingerprints and iris scans cannot be changed like passwords.

## Positive Development: UIDAI Bug Bounty Programme (March 2026)

In a significant step forward, UIDAI launched its first structured Bug Bounty Programme in March 2026, selecting 20 security researchers to audit key platforms including the official website, myAadhaar portal, and the Secure QR Code application. This represents a proactive approach to security that should be expanded in scope and duration.

The programme aligns with Section 8(5) of the Digital Personal Data Protection Act, 2023, which requires Data Fiduciaries to implement appropriate security safeguards. Making this a permanent, open programme (rather than a limited-invite event) would significantly strengthen Aadhaar's security posture.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-13 | Blog post updated with comprehensive analysis |
| 2026-06-13 | CERT-In notification initiated |
| 2026-06-13 | NCIIPC notification (critical infrastructure) |
| 2026-09-11 | 90-day disclosure deadline |

## Recommendations

### Immediate

- **Tighten the CSP**: Remove `unsafe-inline` and `unsafe-eval` from script-src. Use nonce-based or hash-based CSP instead. Remove third-party social media CDNs from script-src on the identity portal — embed social content via iframes (already allowed) rather than script execution.
- **Fix Referrer-Policy**: Change from `unsafe-url` to `strict-origin-when-cross-origin` to prevent URL leakage to third parties.
- **Add Permissions-Policy**: Restrict access to browser APIs (camera, microphone, geolocation) that have no legitimate use on an informational portal.

### Short-Term

- **Expand Bug Bounty**: Convert the limited 20-researcher programme into a continuous, open bug bounty platform. India's security researcher community is large and capable — restricting to 20 researchers leaves most talent untapped.
- **Audit Third-Party Embeds**: Conduct a supply chain risk assessment of all third-party resources loaded on uidai.gov.in (Twitter widgets, Facebook SDK, Bhashini translation plugin, YouTube embeds).
- **Subdomain Hardening**: Ensure all service subdomains have consistent security headers and CSP policies. The current analysis could not reach these portals externally, which is positive from an attack surface perspective but may indicate incomplete monitoring.

### Structural

- **Biometric Data Breach Protocol**: Establish a formal protocol for what happens when biometric data is breached — unlike passwords, biometric data cannot be reset. India needs a national framework for biometric identity recovery.
- **VLE Access Controls**: Implement just-in-time access for village-level operators with multi-factor authentication, session recording, and anomaly detection. The 2018 breach demonstrated that static credentials in the hands of thousands of operators are a systemic risk.
- **Cross-DPI Monitoring**: Given Aadhaar's role as the identity backbone for UPI, DigiLocker, and other DPI systems, establish a cross-platform security monitoring framework. A weakness in one DPI component affects all others.

---

*This is the 21st analysis in our ongoing Indian Government Portal Security Audit series. Previous analyses: [DigiLocker](/blog/digilocker-security-analysis/), [CBSE OASIS](/blog/cbse-oasis-security-analysis/), [UPI/Co-WIN](/blog/uwin-security-analysis/).*

*Dashboard: [Govt Security Audit Dashboard](https://cashlessconsumer.zo.space/govt-security-audit)*
