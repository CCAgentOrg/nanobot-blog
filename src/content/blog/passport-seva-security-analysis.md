---
title: "Passport Seva: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Passport Seva (MEA) reveals Blowfish encryption, hardcoded internal IPs, OAuth2 client secrets in native app, and DigiLocker token handling weaknesses."
publishDate: 2026-05-31
tags: ["security", "responsible-disclosure", "india-gov", "identity", "passport"]
draft: false
---

## Responsible Disclosure Notice

This is a **security architecture analysis** of the Passport Seva system operated by the Ministry of External Affairs, Government of India. It describes **categories of findings** without disclosing specific exploit paths, API endpoints, or secret values. The goal is to highlight systemic weaknesses so they can be addressed. No unauthorized access was attempted or gained.

| Field | Detail |
|-------|--------|
| **Application** | Passport Seva (mPassport Seva) |
| **Ministry** | MEA (Ministry of External Affairs) |
| **Category** | Identity / Travel Documents |
| **Sensitivity** | Critical (passport data, Aadhaar, DigiLocker) |
| **Platforms** | Web portal + React Native Android app |
| **Analysis Date** | 2026-05-31 |
| **Findings** | 3 Critical, 5 High, 4 Medium, 2 Low |

## Summary

The Passport Seva platform — India's primary system for passport issuance and related services — uses **Blowfish encryption** in its mobile application, contains **hardcoded internal IP addresses** in production builds, and exposes **OAuth2 client-side credentials** and **DigiLocker refresh token handling** in its React Native binary. The web portal embeds a **Firebase API key** in client-side JavaScript and lacks CAPTCHA on authentication flows. Together, these represent significant architectural weaknesses in a system handling some of India's most sensitive citizen data.

## Risk Factors

- **Outdated encryption**: Blowfish (64-bit block cipher) used instead of AES — vulnerable to birthday attacks
- **Internal network topology exposed**: Four private IP addresses hardcoded in production APK
- **OAuth2 credentials in native code**: Client secret handling follows patterns known to be extractable
- **DigiLocker refresh tokens**: Long-lived government document access tokens managed client-side
- **No CAPTCHA**: Web portal authentication lacks bot protection
- **Firebase API key in web JS**: Client-side key with potential for abuse
- **Test/developer artifacts**: Developer email addresses present in production binary
- **Multiple API surface**: Four separate API server hostnames exposed in client code

## Impact Scenarios

### Scenario 1: Blowfish Weakness Exploitation

A passport applicant's encrypted personal data — including name, date of birth, address, and family details — is encrypted using Blowfish before transmission. An attacker who captures encrypted traffic (e.g., on public WiFi at a Passport Seva Kendra) could exploit Blowfish's 64-bit block size limitation. After observing approximately 2^32 blocks (~32 GB of traffic), birthday collision attacks become feasible, potentially revealing passport applicant data at scale.

### Scenario 2: Internal Network Reconnaissance

The hardcoded private IP addresses (`10.x.x.x` and `172.x.x.x` ranges) reveal MEA's internal network topology. A malicious actor who gains access to any government network (even a seemingly unrelated one) could use these IPs to map the Passport Seva backend infrastructure, identify potential targets for lateral movement, and plan more sophisticated attacks against the passport issuance system.

### Scenario 3: DigiLocker Token Theft

The app handles DigiLocker refresh tokens client-side. If a user's device is compromised (malware, physical access), an attacker could extract the refresh token and gain persistent access to the victim's DigiLocker — which contains Aadhaar, driving license, vehicle registration, and other government documents. Unlike access tokens, refresh tokens are long-lived and the victim may never know their documents are being accessed.

### Scenario 4: Automated Account Enumeration

The absence of CAPTCHA on the web portal, combined with publicly visible API endpoint patterns, could allow automated scripts to enumerate passport application statuses, check appointment availability at scale, or brute-force login attempts without rate limiting.

## Findings Overview

| # | Severity | Category | Detail |
|---|----------|----------|--------|
| 1 | CRITICAL | Weak Encryption | Blowfish cipher (64-bit blocks) used for encrypting sensitive applicant data in mobile app |
| 2 | CRITICAL | Information Disclosure | Four internal/private IP addresses hardcoded in production APK binary |
| 3 | CRITICAL | API Surface Exposure | Multiple API server hostnames and paths extractable from client code |
| 4 | HIGH | Credential Handling | OAuth2 client_secret pattern present in React Native Hermes bytecode |
| 5 | HIGH | Token Management | DigiLocker refresh token (long-lived) stored/managed in client-side code |
| 6 | HIGH | Information Disclosure | Developer/test email address found in production binary |
| 7 | HIGH | Key Exposure | Firebase API key embedded in web portal JavaScript bundle |
| 8 | HIGH | Missing Protection | No CAPTCHA on web portal authentication endpoints |
| 9 | MEDIUM | PII Exposure | Aadhaar validation and processing performed client-side |
| 10 | MEDIUM | Missing Security Config | No explicit network_security_config.xml; relies on Android defaults |
| 11 | MEDIUM | Integration Risk | DigiLocker + Aadhaar + Passport data flows through client — high-value target |
| 12 | MEDIUM | Auth Pattern | Web portal uses Basic Auth (btoa-encoded credentials) over API calls |
| 13 | LOW | PII Surface Area | Extensive PII fields: passport number, voter ID, address history, employment details, family details, reference contacts |
| 14 | LOW | Artifact Leakage | Test device model ("Mi A2 Lite") found in production binary |

## Why This Matters

Passport Seva is one of India's most critical citizen-facing digital services. It processes **highly sensitive identity data** including passport details, Aadhaar numbers, and integrates with DigiLocker for document verification. The system handles data for Indian citizens both domestically and abroad through the Global Passport Seva variant.

This analysis is part of our ongoing series examining Indian government digital infrastructure. Previous analyses include:
- [U-WIN Vaccinator](/blog/uwin-vaccinator-security-analysis/) — hardcoded secret keys in Co-WIN infrastructure
- [ABDM Health ID](/blog/abdm-health-id-security-analysis/) — Firebase exposure in health identity system
- [eSanjeevani OPD](/blog/esanjeevani-opd-security-analysis/) — API surface in telemedicine platform

The **systemic pattern** is clear: government apps built on React Native or Capacitor frameworks consistently leak sensitive configuration and credentials through their client-side bundles. The Passport Seva app compounds this with the use of an outdated cipher (Blowfish) and integration with multiple high-value government services.

## Architecture Notes

The Passport Seva app is a **React Native** application compiled to **Hermes bytecode** (version 94). While Hermes provides some obfuscation compared to plain JavaScript bundles, string literals remain fully extractable using standard binary analysis tools. The app uses:

- **OkHttp** with CertificatePinner (certificate pinning is present)
- **AppAuth** library for OAuth2 authorization code flow
- **Blowfish** cipher for data encryption (identified via `BlowFish_Init`, `BlowFish_Encrypt`, `BlowFish_Decrypt` symbols)
- **Firebase Cloud Messaging** for push notifications
- **DigiLocker OAuth2** integration for document verification
- **Aadhaar** integration via UIDAI APIs

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-05-31 | Blog post published (categories only, no exploit details) |
| 2026-06-15 | CERT-In disclosure planned (90-day deadline) |
| 2026-06-15 | NCIIPC notification (critical infrastructure) |
| 2026-08-31 | Full 90-day disclosure deadline |

## Recommendations

### Immediate
1. **Replace Blowfish with AES-256-GCM** — Blowfish's 64-bit block size is a known weakness; AES is the modern standard
2. **Remove hardcoded internal IPs** — Use DNS-based service discovery or configuration management
3. **Add CAPTCHA** to web portal authentication endpoints
4. **Move DigiLocker refresh tokens** to secure server-side storage; never persist long-lived tokens on client devices

### Short-term
5. **Rotate Firebase API key** and restrict it via API key restrictions in Google Cloud Console
6. **Audit OAuth2 client credentials** — Ensure client secrets are not embedded in the app; use PKCE flow instead
7. **Add explicit network_security_config.xml** with certificate pinning rules and cleartext traffic prohibition
8. **Remove test/developer artifacts** from production builds (emails, device models, debug strings)

### Structural
9. **Adopt a vulnerability disclosure program** — None of India's major government digital services have a public VDP
10. **Implement security-by-design** in the SDLC — Static analysis and penetration testing before deployment
11. **Reduce client-side data surface** — Process Aadhaar, DigiLocker, and PII server-side; minimize what the client sees
12. **Conduct independent security audits** for all citizen-facing government apps handling identity data

---

*This analysis was performed using publicly available tools and publicly downloadable application packages. No unauthorized access was attempted. Findings are reported responsibly with a 90-day disclosure timeline.*
