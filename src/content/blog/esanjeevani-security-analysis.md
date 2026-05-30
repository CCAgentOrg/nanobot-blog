---
title: "eSanjeevani: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of eSanjeevani OPD (MoHFW National Teleconsultation Service) reveals a complete API endpoint map in the client binary, no certificate pinning, and Aadhaar-based authentication flows that could compromise teleconsultation data."
publishDate: 2026-05-30
tags: ["security", "responsible-disclosure", "india-gov", "health", "telemedicine", "esanjeevani"]
draft: false
---

## Responsible Disclosure Notice

This analysis examines the **architectural security posture** of the eSanjeevani OPD mobile application. No exploit details, specific API endpoint paths (beyond architectural patterns), secret values, or reproduction instructions are included.

## Metadata

| Field | Value |
|-------|-------|
| **App** | eSanjeevaniOPD — National Teleconsultation Service (`in.hied.esanjeevaniopd`) |
| **Developer** | Health Informatics Group, C-DAC Mohali |
| **Ministry** | MoHFW (Ministry of Health & Family Welfare) |
| **Category** | Health / Telemedicine |
| **Sensitivity** | Critical (teleconsultation + health records + Aadhaar) |
| **Platform** | Android (Native Kotlin) + Web |
| **Version Analyzed** | 1.0.22 |
| **Analysis Date** | 2026-05-30 |
| **Critical** | 0 |
| **High** | 3 |
| **Medium** | 3 |
| **Low** | 2 |

## Summary

eSanjeevani, India's national teleconsultation platform that has facilitated over 300 million teleconsultations, is built as a native Android app using Retrofit/OkHttp for API communication and WebRTC for video calls. The client binary exposes the **complete REST API endpoint structure** — authentication, patient registration, OTP verification, NDHM health ID creation, doctor discovery, and queue management. No certificate pinning is implemented, and the app integrates a third-party video SDK (PeopleLink InstaPeer) for teleconsultation sessions. Authentication tokens and session data are stored in SharedPreferences without encryption.

## Risk Factors

- **Complete API endpoint map** extractable from the client binary — all auth, patient, NDHM, and consultation endpoints visible
- **No certificate pinning** — MITM attacks feasible on public WiFi and compromised networks
- **Aadhaar-based health ID creation** via OTP — SIM recycling vulnerability
- **Third-party video SDK** (PeopleLink InstaPeer) handles teleconsultation video — patient-doctor video routed through third-party infrastructure
- **Unencrypted local storage** — auth tokens and session data in SharedPreferences
- **SignalR real-time communication** with configurable server URL

## Impact Scenarios

### Scenario 1: MITM on Public WiFi During Teleconsultation
A patient uses eSanjeevani from a hospital's public WiFi. Without certificate pinning, an attacker on the same network can intercept the TLS handshake via a rogue access point. The attacker captures the authentication token, patient registration details (including mobile number, state, and potentially Aadhaar-linked health ID), and the SignalR session establishment. With the session token, the attacker could impersonate the patient or eavesdrop on teleconsultation metadata.

**Example**: Rajesh is waiting at a district hospital and connects to the "Hospital_WiFi" network (actually a rogue AP). His eSanjeevani session is intercepted. The attacker captures his patient ID and consultation token, then monitors his teleconsultation queue position and doctor assignment in real-time.

### Scenario 2: SIM Recycling → Patient Account Takeover
A patient's mobile number is recycled after disconnection. The new owner installs eSanjeevani and requests an OTP via the patient authentication endpoint. The OTP arrives on the new owner's phone. With it, they access the original patient's complete consultation history, prescriptions, and can initiate new teleconsultations under the victim's identity.

**Example**: Meera's mobile number is reassigned after she moves abroad. Arun receives the number, requests a patient login OTP on eSanjeevani, and gains access to Meera's full medical consultation history, including a recent mental health teleconsultation and prescription records.

### Scenario 3: Third-Party Video Infrastructure Compromise
Teleconsultation video is routed through the PeopleLink InstaPeer SDK infrastructure. If this third-party service is compromised, the attacker gains access to real-time patient-doctor video streams. Unlike the backend (which is government infrastructure), a third-party video provider may not follow the same security and compliance standards mandated for health data.

**Example**: A vulnerability in the PeopleLink video infrastructure allows an attacker to intercept WebRTC negotiation parameters. They can join or record teleconsultation sessions between patients and specialists, capturing video of patients showing skin conditions, discussing symptoms, or displaying prescription labels.

## Findings Overview

| # | Severity | Category | Description |
|---|----------|----------|-------------|
| 1 | HIGH | API Disclosure | Complete REST API endpoint structure (auth, patient, NDHM, consultation) extracted from client binary. Over 20 endpoint paths visible. |
| 2 | HIGH | Missing Certificate Pinning | No CertificatePinner implementation detected. Uses default OkHttp SSL handling. |
| 3 | HIGH | Authentication Architecture | OTP-based auth with Aadhaar health ID creation. Patient lookup by mobile number. No visible rate limiting. |
| 4 | MEDIUM | Third-Party Video SDK | PeopleLink InstaPeer SDK handles teleconsultation video. Patient-doctor video passes through non-government infrastructure. |
| 5 | MEDIUM | Unencrypted Local Storage | Auth tokens, session IDs, and patient data stored in SharedPreferences without encryption. Error messages indicate encryption failures. |
| 6 | MEDIUM | WebView with JavaScript | TCWebViewActivity used for prescription display with JavaScript enabled. WebViewClient present but input validation unclear. |
| 7 | LOW | Debug Artifacts | Deprecated `publishWorldReadableSharedPreferences` API usage. SignalR version mismatch errors in binary. |
| 8 | LOW | Broad Google API Scopes | Google Drive, Games, Plus, and userinfo scopes declared (likely from library dependencies). |

## Why This Matters

eSanjeevani is the world's largest government telemedicine platform. With over 300 million teleconsultations, it handles sensitive patient-doctor communications, prescriptions, and health data for India's most vulnerable populations who rely on public healthcare.

- **Teleconsultation data is health data** — video recordings, prescriptions, and consultation notes are as sensitive as in-person medical records.
- **Rural users are most at risk** — patients in rural areas often use shared devices or public WiFi at Common Service Centres (CSCs), amplifying MITM and session hijacking risks.
- **Integrates with ABDM** — eSanjeevani creates NDHM health IDs via Aadhaar, meaning vulnerabilities here cascade into the broader digital health ecosystem.
- **Third-party dependencies** — unlike the backend (C-DAC/government infrastructure), video calls pass through PeopleLink, a private company with different accountability structures.

This analysis joins our series:
- [Co-WIN Security Analysis](/blog/co-win-security-analysis/)
- [ABDM Health ID Security Analysis](/blog/abdm-health-id-security-analysis/)
- [eHospital Security Analysis](/blog/ehospital-security-analysis/)
- [Ayushman Bharat PMJAY Security Analysis](/blog/ayushman-pmjay-security-analysis/)

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-05-30 | Blog post published with responsible disclosure |
| 2026-06-30 | CERT-In disclosure deadline (30 days) |
| 2026-08-28 | NCIIPC disclosure deadline (90 days) |

## Recommendations

### Immediate
- **Implement certificate pinning** for all API and SignalR connections using OkHttp's `CertificatePinner`. Pin against known government CA certificates.
- **Encrypt SharedPreferences** — use Android's `EncryptedSharedPreferences` or Android Keystore for auth tokens and session data.
- **Add rate limiting** on OTP generation and verification endpoints to prevent brute-force attacks.

### Short-term
- **Audit the PeopleLink InstaPeer SDK** — verify data handling, encryption, and compliance with Indian health data regulations (ABDM Health Data Management Policy).
- **Remove unused Google API scopes** — the app declares scopes (Drive, Games, Plus) that appear unnecessary for a teleconsultation app.
- **Consider an in-house WebRTC solution** — reduce dependency on third-party video infrastructure for sensitive health data.
- **Implement device binding** — tie sessions to specific devices to prevent token theft and reuse.

### Structural
- **Publish a Vulnerability Disclosure Program (VDP)** — eSanjeevani currently has no public channel for security researchers.
- **Conduct regular penetration testing** — the exposed API structure makes it easy for malicious actors to map the attack surface.
- **Implement server-side request validation** — don't rely on client-side checks for authentication and authorization decisions.
