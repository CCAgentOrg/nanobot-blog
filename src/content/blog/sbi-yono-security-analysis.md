---
title: "SBI YONO: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of SBI YONO reveals CVE-2025-45080 (critical MITM vulnerability), internal data warehouse endpoint exposed in CSP, and CSP misconfiguration on India's largest bank's digital platform."
publishDate: 2026-06-13
tags: ["security", "responsible-disclosure", "india-gov", "finance", "sbi"]
draft: false
---

# SBI YONO: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. CVE-2025-45080 is a publicly disclosed vulnerability. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | SBI YONO (You Only Need One) |
| **Ministry/Body** | SBI (State Bank of India — PSU) |
| **Data Category** | Banking & Financial Data |
| **Sensitivity** | 🔴 Critical |
| **Platform** | Web + Android/iOS App |
| **Analysis Date** | 2026-06-13 |
| **Critical Findings** | 1 |
| **High Findings** | 2 |
| **Medium Findings** | 2 |
| **Low Findings** | 1 |

## Summary

This analysis examined the client-side architecture of **SBI YONO**, operated by the **State Bank of India** — India's largest bank with 500M+ customers. The system handles **banking, investments, insurance, and shopping** — classified as **critical** sensitivity.

The analysis combined CSP analysis of sbi.co.in and sbi.bank.in with publicly disclosed vulnerability data. It identified **1 critical**, **2 high**, **2 medium**, and **1 low** severity findings, including a publicly assigned CVE (CVE-2025-45080) for the YONO mobile app, and an internal data warehouse endpoint exposed in the web portal's CSP.

## Risk Factors

- **CVE-2025-45080**: Critical MITM vulnerability in YONO app due to unencrypted HTTP connections
- Internal data warehouse endpoint exposed in CSP `connect-src` directive
- CSP with `unsafe-inline` and `unsafe-eval` on banking portal
- Google Tag Manager and Analytics loaded on banking infrastructure
- Active phishing campaigns using fake YONO apps
- Referrer-Policy allows URL leakage on cross-origin navigation

## Impact Scenarios

### Scenario: Man-in-the-Middle Attack on YONO App (CVE-2025-45080, Documented)

A critical vulnerability (CVE-2025-45080) was publicly disclosed in the YONO SBI mobile application. The app made connections over unencrypted HTTP instead of HTTPS, allowing attackers on the same network (public WiFi, compromised routers, rogue access points) to intercept banking data in transit. For a banking app used by hundreds of millions of customers — many accessing financial services for the first time — this represents a severe risk, particularly in areas with shared or public network infrastructure.

### Scenario: Internal Data Warehouse Exposure

The CSP `connect-src` directive on sbi.bank.in includes an endpoint on an internal data warehouse subdomain. While the CSP itself doesn't grant access, it reveals the existence and location of internal reporting infrastructure. An attacker could use this information to target the data warehouse directly, potentially accessing customer analytics, reporting data, or internal metrics. The subdomain naming convention (suggesting a marketing/disclosure reporting system) indicates this endpoint may handle aggregated customer data.

### Scenario: Fake YONO App Phishing (Documented, Ongoing)

Multiple reports document phishing campaigns where fraudsters send SMS or WhatsApp messages claiming to be YONO updates or KYC verifications. These messages link to fake YONO apps or phishing pages that capture banking credentials. SBI has issued public warnings about these campaigns, indicating they are ongoing and successful. The existence of CVE-2025-45080 compounds this risk — even security-conscious users who verify they have the "real" app were vulnerable to network-level attacks.

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| 🔴 CRITICAL | CVE-2025-45080 | YONO app MITM vulnerability — unencrypted HTTP for banking data |
| 🟠 HIGH | Internal Endpoint Exposure | Data warehouse endpoint visible in CSP connect-src |
| 🟠 HIGH | CSP Misconfiguration | `unsafe-inline` + `unsafe-eval` in script-src on banking portal |
| 🟡 MEDIUM | Third-Party Tracking | Google Tag Manager + Analytics on banking infrastructure |
| 🟡 MEDIUM | Referrer Policy | `no-referrer-when-downgrade` allows URL leakage on HTTP downgrade |
| 🔵 LOW | Stale Content | Main redirect page last modified September 2025 (9+ months ago) |

## Why This Matters

SBI is India's largest bank:

- **500M+ customers** — 1 in 3 Indians has an SBI account
- **YONO**: 50M+ registered users, India's most downloaded banking app
- **₹60+ lakh crore** in deposits
- Handles government benefit transfers, pension payments, and public sector salaries

When India's largest bank has a critical MITM vulnerability in its flagship mobile app, it affects the entire population — not just tech-savvy users. Many YONO users are first-time digital banking customers who may not understand network security risks.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2025 | CVE-2025-45080 publicly disclosed |
| 2026-06-13 | Blog post updated with comprehensive analysis |
| 2026-06-13 | CERT-In notification initiated |
| 2026-09-11 | 90-day disclosure deadline |

## Recommendations

### Immediate

- **Patch CVE-2025-45080**: Force HTTPS for all connections in the YONO app. Implement certificate pinning for critical API endpoints. This should have been done before the CVE was publicly assigned.
- **Remove internal endpoint from CSP**: The data warehouse endpoint in `connect-src` should not be visible to end users. Move reporting/analytics calls to a separate, backend-only channel.

### Short-Term

- **Tighten CSP**: Remove `unsafe-inline` and `unsafe-eval` from script-src. Use nonce-based CSP. SBI's portal already uses good cookie security (SameSite=Strict, Secure, HttpOnly) — extend this rigor to CSP.
- **Fix Referrer-Policy**: Change from `no-referrer-when-downgrade` to `strict-origin-when-cross-origin`.
- **Audit Google Tag Manager**: Evaluate whether marketing analytics scripts belong on banking infrastructure. At minimum, ensure GTM containers are audited and restricted to prevent arbitrary script injection.

### Structural

- **App store integrity**: Work with Google and Apple to aggressively take down fake YONO apps and phishing domains. The ongoing phishing campaigns indicate that reactive takedowns are insufficient — proactive monitoring is needed.
- **Customer security education**: SBI's cybersecurity awareness page is a positive step. Expand this with in-app security indicators (connection security status, certificate verification) that help non-technical users understand when something is wrong.
- **Regular penetration testing**: Given SBI's size and criticality, conduct quarterly (not annual) penetration tests covering both web and mobile attack surfaces.

---

*See our related analysis: [SBI CMS](/blog/sbi-cms-security-analysis/). Other banking analyses: [UCO Bank](/blog/uco-bank-security-analysis/), [IPPB](/blog/ippb-security-analysis/).*

*Dashboard: [Govt Security Audit Dashboard](https://cashlessconsumer.zo.space/govt-security-audit)*
