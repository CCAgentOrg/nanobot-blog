---
title: "BHIM UPI: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of BHIM UPI (NPCI) reveals third-party ad tracking on government payment infrastructure, mixed CSP configuration, and systemic NPCI-wide tracking patterns across all payment platforms."
publishDate: 2026-06-13
tags: ["security", "responsible-disclosure", "india-gov", "finance", "npci"]
draft: false
---

# BHIM UPI: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | BHIM UPI (Bharat Interface for Money) |
| **Ministry/Body** | NPCI (National Payments Corporation of India) |
| **Data Category** | Financial & Payment Data |
| **Sensitivity** | 🔴 Critical |
| **Platform** | Web (bhimupi.org.in) + Android/iOS App |
| **Analysis Date** | 2026-06-13 |
| **Critical Findings** | 1 |
| **High Findings** | 3 |
| **Medium Findings** | 3 |
| **Low Findings** | 1 |

## Summary

This analysis examined the client-side architecture of **BHIM UPI**, operated by **NPCI** — India's government-backed UPI payment app with 100M+ downloads. The system handles **financial transactions, bank account linking, and UPI PIN management** — classified as **critical** sensitivity.

The analysis combined CSP analysis of bhimupi.org.in with publicly documented security research. It identified **1 critical**, **3 high**, **3 medium**, and **1 low** severity findings, including extensive third-party ad tracking infrastructure on the government payment portal and a systemic NPCI-wide pattern of tracking scripts on financial infrastructure.

## Risk Factors

- Third-party ad tracking (DoubleClick, AdSense, Floodlight) on government payment infrastructure — confirmed as NPCI-wide systemic issue
- Mixed CSP configuration using both `unsafe-inline` AND nonce-based policies — defeating the security benefit of nonces
- Third-party AI chatbot (Corover.ai) with full script execution context on payment portal
- Academic research (USENIX 2020) demonstrated device binding attacks on BHIM
- Unofficial marketing site (bhim.org.in) on Hostinger — separate from NPCI infrastructure
- UPI fraud losses exceeding ₹485 crore in FY2024-25

## Impact Scenarios

### Scenario: Third-Party Ad Tracking on Payment Infrastructure

The bhimupi.org.in CSP explicitly allows scripts from three separate DoubleClick Floodlight accounts, Google AdSense, Google AdWords, Facebook SDK, and Twitter widgets. This means advertising infrastructure has code execution context on India's government payment portal. A compromise at any of these ad networks — which has happened repeatedly across the industry — would give attackers a script injection vector on financial infrastructure.

This is not an isolated finding. Our analysis of NPCI PaySeva and NPCI MAP revealed the exact same tracking infrastructure. This confirms a systemic, NPCI-wide deployment of advertising scripts across all payment platform web properties.

### Scenario: Academic Attack on Device Binding (Documented, USENIX 2020)

Peer-reviewed research published at USENIX Security 2020 demonstrated that an attacker with a target's phone number and partial debit card information (last six digits and expiry date, printed on the card) could bind the victim's bank account to a new device and perform unauthorized transactions. The attack exploited BHIM's alternate handshake mechanism. While NPCI may have addressed this specific vector, the underlying architectural pattern — using partial card data for device binding — represents a systemic risk.

### Scenario: Unofficial BHIM Domain as Phishing Vector

The domain bhim.org.in hosts a marketing page on Hostinger Website Builder (a budget hosting platform), separate from NPCI's infrastructure. The page's `frame-ancestors` CSP allows framing from multiple Hostinger domains. An attacker could register a similar domain or exploit the Hostinger association for phishing — users expecting NPCI-grade security on a "BHIM" domain instead encounter a budget hosting platform with minimal security.

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| 🔴 CRITICAL | Third-Party Ad Tracking | DoubleClick, AdSense, Floodlight (3 accounts), Facebook SDK on payment portal — NPCI-wide systemic issue |
| 🟠 HIGH | Mixed CSP Configuration | `unsafe-inline` + nonce-based CSP defeats nonce security model |
| 🟠 HIGH | Third-Party AI Chatbot | Corover.ai chatbot with script-src access on payment portal |
| 🟠 HIGH | Academic Vulnerability | USENIX 2020: Device binding attack using partial debit card data |
| 🟡 MEDIUM | Backend Server Leak | `x-backend-app: bhim-server1` header exposes server identity |
| 🟡 MEDIUM | Unofficial Domain | bhim.org.in on Hostinger Website Builder, not NPCI infrastructure |
| 🟡 MEDIUM | Cloud Resource References | Azure blob storage and Linode object storage in CSP |
| 🔵 LOW | CDN Information Leak | Akamai server-timing header with request routing data |

## Why This Matters

BHIM is the government's flagship UPI payment app, promoted as "Bharat Ka Apna Payments App." It serves as the reference implementation for India's UPI ecosystem:

- **100M+ downloads** on Google Play
- **Direct bank-to-bank transfers** using UPI IDs
- **RuPay Credit Card on UPI** integration
- **UPI Circle** for non-bank-account holders
- **Foundation for financial inclusion** initiatives

When the government's own payment app portal loads advertising scripts, it sets a dangerous precedent. If NPCI considers ad tracking acceptable on payment infrastructure, every UPI app developer may follow suit — multiplying the attack surface across India's entire digital payments ecosystem.

## Positive Developments

### NPCI Mobile Application Security Framework (May 2025)

NPCI issued circular NPCI2025-26IS003 mandating security controls for UPI mobile applications, including root detection, RASP (Runtime Application Self-Protection), SDK handling, and annual CERT-In empanelled audits. This represents a structured approach to app-level security.

### BHIM App Update

The BHIM app has been rebranded as "BHIM Bharat's Own Payments App" with enhanced security features, including passcode protection and UPI PIN requirements for all outgoing transactions.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-13 | Blog post published |
| 2026-06-13 | CERT-In notification initiated |
| 2026-09-11 | 90-day disclosure deadline |

## Recommendations

### Immediate

- **Remove ad tracking from payment infrastructure**: Remove DoubleClick, AdSense, Floodlight, and Facebook SDK from bhimupi.org.in CSP. This is a payment portal — not a marketing site. The presence of ad tracking on financial infrastructure is a systemic NPCI issue confirmed across three separate analyses.
- **Fix CSP configuration**: Remove `unsafe-inline` from script-src. The CSP already uses nonces and hashes — `unsafe-inline` is ignored by modern browsers when nonces are present, but keeping it signals misconfiguration and confuses older browser fallback.

### Short-Term

- **Audit Corover.ai chatbot**: Conduct a supply chain risk assessment of the third-party AI chatbot service. Ensure chatbot sessions cannot access payment-related cookies, tokens, or local storage.
- **Secure bhim.org.in**: Either redirect bhim.org.in to bhimupi.org.in with proper security headers, or remove it entirely. An unofficial BHIM domain on budget hosting is a phishing risk.
- **Remove backend header**: Remove `x-backend-app` header to prevent server fingerprinting.

### Structural

- **NPCI-wide tracking audit**: Our analysis confirms advertising scripts on three separate NPCI properties (PaySeva, MAP, BHIM). Conduct a comprehensive audit of ALL npci.org.in subdomains for tracking scripts and establish a policy that financial infrastructure must not load advertising SDKs.
- **Implement Content-Security-Policy-Report-Only**: Before tightening CSP, deploy report-only mode to identify all legitimate script sources and ensure no functionality breaks during CSP hardening.

---

*This analysis confirms a systemic NPCI-wide pattern of third-party ad tracking on financial infrastructure. See our related analyses: [NPCI PaySeva](/blog/npci-payseva-security-analysis/), [NPCI MAP](/blog/npci-map-security-analysis/).*

*Dashboard: [Govt Security Audit Dashboard](https://cashlessconsumer.zo.space/govt-security-audit)*
