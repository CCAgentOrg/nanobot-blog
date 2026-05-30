---
title: "ABDM Health ID (ABHA App): Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of the ABDM Health ID / ABHA mobile app (MoHFW) reveals hardcoded Firebase credentials for a patient health registry, leaked internal infrastructure IPs, and Aadhaar-based authentication patterns that could expose health data of Indian citizens."
publishDate: 2026-05-30
tags: ["security", "responsible-disclosure", "india-gov", "health", "abdm", "aadhaar"]
draft: false
---

## Responsible Disclosure Notice

This analysis examines the **architectural security posture** of the ABDM Health ID (ABHA) mobile application. No exploit details, specific API endpoint paths, secret values, or reproduction instructions are included. The goal is to highlight systemic risks so they can be addressed before malicious actors exploit them.

## Metadata

| Field | Value |
|-------|-------|
| **App** | ABDM Health ID (ABHA) — `in.ndhm.phr` |
| **Ministry** | MoHFW (Ministry of Health & Family Welfare) |
| **Category** | Health / Digital Health ID |
| **Sensitivity** | Critical (health records + Aadhaar) |
| **Platform** | Android (Flutter) + Web |
| **Version Analyzed** | 3.3.0-Godavari |
| **Analysis Date** | 2026-05-30 |
| **Critical** | 0 |
| **High** | 3 |
| **Medium** | 3 |
| **Low** | 2 |

## Summary

The ABHA mobile app, which manages Ayushman Bharat Health Accounts for millions of Indian citizens, is built on Flutter. While Flutter apps are harder to reverse-engineer than Capacitor/WebView apps, string extraction from the compiled binary reveals a Firebase Realtime Database URL for a **patient health registry** with an associated API key, a leaked internal infrastructure IP address (in the CGNAT/private range), and multiple government API base URLs. The app handles Aadhaar-based KYC and OTP-based authentication for accessing health records — making it a high-value target for SIM-recycling and credential-reuse attacks.

## Risk Factors

- **Hardcoded Firebase project details** for a patient health registry embedded in the client binary
- **Leaked internal/private IP address** (100.64.x.x CGNAT range) for an internal API service — left in the production build
- **Aadhaar-based identity verification** with OTP as the sole second factor — vulnerable to SIM recycling
- **Health record sharing topics** visible in the binary, revealing the messaging/notification architecture
- **No visible certificate pinning** in the WebView component
- **Sandbox/test patient data** shipped in the production APK
- **Test/debug API endpoints** (placeholder services) left in the release build

## Impact Scenarios

### Scenario 1: SIM Recycling → Health Record Access
An adversary obtains a recycled mobile number previously linked to an ABHA account. Since OTP is the primary (and often sole) authentication factor for Aadhaar-based KYC, the attacker could receive OTPs intended for the original user. With access to the ABHA account, they can view longitudinal health records — diagnoses, prescriptions, lab results, immunization history — across all linked healthcare providers.

**Example**: A user named Priya discontinues her mobile number. Six months later, Raj receives that number as a new SIM. Raj installs the ABHA app, enters the number, receives an OTP, and gains access to Priya's complete medical history including a sensitive diagnosis from a private consultation.

### Scenario 2: Firebase Misconfiguration Risk
While the Firebase Realtime Database rules currently deny unauthenticated access, the project name ("patient-health-registry") and API key are hardcoded in the app binary. If a developer inadvertently loosens the Firebase Security Rules during debugging or a configuration error, the database becomes immediately accessible to anyone who has extracted these values from the APK — which is publicly available on app stores and mirror sites.

**Example**: During a routine backend migration, a developer sets Firebase rules to `allow read, write: if true;` temporarily. Within hours, automated scanners discover the open database. Health records for the registry's entire patient population become accessible via a simple REST call.

### Scenario 3: Infrastructure Reconnaissance
The leaked internal IP address (in the 100.64.0.0/10 range, commonly used for private networks and overlay networks like Tailscale/WireGuard) reveals the service architecture. Combined with the visible API base URL pattern and MQTT messaging topics, an attacker gains significant intelligence about the backend infrastructure layout without any active probing.

## Findings Overview

| # | Severity | Category | Description |
|---|----------|----------|-------------|
| 1 | HIGH | Hardcoded Cloud Credentials | Firebase API key for "patient-health-registry" project found in compiled binary. While database rules deny public access, the key and project structure are permanently exposed. |
| 2 | HIGH | Information Disclosure — Internal IPs | Private/CGNAT-range IP address with a service port found hardcoded in the binary — likely an internal development or staging endpoint that leaked into production. |
| 3 | HIGH | Authentication Architecture | Aadhaar-based KYC relies on OTP as the sole second factor. Multiple OTP-related routes (generate, verify, resend) are visible. No visible rate limiting or CAPTCHA enforcement on the client side. |
| 4 | MEDIUM | Missing Certificate Pinning | No certificate pinning detected in the WebView component. `allowUniversalAccessFromFileURLs` pattern found, indicating the WebView may have overly permissive file access. |
| 5 | MEDIUM | Test Data in Production | Sandbox sample data with realistic-looking FHIR health records (patient names, HIP IDs, diagnostic codes) shipped in the production APK. |
| 6 | MEDIUM | Architecture Disclosure | MQTT/WebSocket topic patterns for health record sharing, consent management, and order processing visible in binary strings. |
| 7 | LOW | Debug/Test Artifacts | External test API endpoints (placeholder services) found in the binary. Indicates insufficient build sanitization. |
| 8 | LOW | Data Leakage via Third Parties | Firebase Analytics, Crashlytics, Messaging, Performance, and Remote Config integrated — sharing app usage patterns and potentially health-related navigation data with Google. |

## Why This Matters

The ABDM Health ID is the cornerstone of India's Digital Public Infrastructure for health. Every citizen's ABHA number links to their longitudinal health records across all ABDM-registered healthcare providers. The stakes are existential:

- **Health data is uniquely sensitive** — it cannot be "reset" like a password. A diagnosis, prescription, or lab result is permanently identifying.
- **The CBSE precedent** — The 2024 CBSE student data leak showed that government databases with inadequate access controls become targets. Health records are an order of magnitude more sensitive than exam scores.
- **Aadhaar linkage amplifies risk** — When health data is linked to Aadhaar (a universal identity), breaches become identity-scale, not just record-scale.
- **DPI cascading failures** — ABHA integrates with the broader ABDM ecosystem (HIE-CM, HIPs, HIUs). A vulnerability in the identity layer cascades across the entire health data exchange network.

This analysis joins our series examining Indian government digital infrastructure:
- [Co-WIN Security Analysis](/blog/co-win-security-analysis/)
- [eHospital Security Analysis](/blog/ehospital-security-analysis/)
- [DigiLocker Security Analysis](/blog/digilocker-security-analysis/)
- [Ayushman Bharat PMJAY Security Analysis](/blog/ayushman-pmjay-security-analysis/)

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-05-30 | Blog post published with responsible disclosure |
| 2026-06-30 | CERT-In disclosure deadline (30 days) |
| 2026-08-28 | NCIIPC disclosure deadline (90 days) |
| 2026-08-28 | Full technical details shared with CERT-In/NCIIPC if unaddressed |

## Recommendations

### Immediate
- **Audit Firebase Security Rules** for the patient-health-registry project. Ensure rules enforce authentication and authorization checks, not just authentication.
- **Remove internal IP addresses** from production builds. Use build variants or environment-based configuration.
- **Remove test/sample data** from production APKs. Use separate build configurations for sandbox vs production.

### Short-term
- **Implement certificate pinning** for all API communications, especially those transmitting Aadhaar data or health records.
- **Add CAPTCHA/rate limiting** on OTP generation endpoints to prevent brute-force and abuse.
- **Consider additional authentication factors** beyond OTP for high-sensitivity operations (viewing detailed health records, sharing records with new providers).
- **Sanitize build output** — strip debug strings, test URLs, and internal references from release builds.

### Structural
- **Publish a Vulnerability Disclosure Program (VDP)** — ABDM currently has no public channel for security researchers to report findings. This is essential for a system handling health data at national scale.
- **Adopt a security-by-design approach** for the ABDM ecosystem — third-party PHR apps, HIP integrations, and HIE-CM participants should be held to a baseline security standard with periodic audits.
- **Consider SIM-binding or device-binding** for ABHA accounts to mitigate SIM-recycling attacks on health data.
