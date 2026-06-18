---
title: "NPPA: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of the National Pharmaceutical Pricing Authority portal (nppa.gov.in, Ministry of Finance / Department of Pharmaceuticals) reveals a broken TLS certificate chain, no HTTPS redirect or HSTS, no Content Security Policy, and HTTP-served assets on the HTTPS surface — systemic transport-layer weaknesses on India's drug price regulator."
publishDate: 2026-06-18
tags: ["security", "responsible-disclosure", "india-gov", "finance"]
draft: false
---

# NPPA: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. The portal is publicly reachable; only passive observation of HTTP response headers and client-side HTML/JavaScript was performed. Findings have been logged for responsible disclosure.

| Field | Detail |
|-------|--------|
| **Application** | NPPA (National Pharmaceutical Pricing Authority) |
| **Ministry/Body** | Department of Pharmaceuticals (administratively under Ministry of Finance / MoHFW) |
| **Data Category** | Drug Pricing & Regulatory Orders |
| **Sensitivity** | 🟡 Medium |
| **Platform** | Web (nppa.gov.in) |
| **Analysis Date** | 2026-06-18 |
| **Critical Findings** | 0 |
| **High Findings** | 3 |
| **Medium Findings** | 3 |
| **Low Findings** | 1 |

## Summary

This analysis examined the client-side architecture of the **National Pharmaceutical Pricing Authority (NPPA)** — India's drug pricing regulator, which fixes ceiling prices of essential medicines, monitors availability of scheduled drugs, and enforces the Drugs (Prices Control) Order. NPPA decisions directly affect the prices patients pay at pharmacy counters across India.

The portal is built on **Laravel (PHP)** with a jQuery 3.6.1 + Bootstrap frontend. The analysis combined HTTP header inspection with passive review of rendered HTML and JavaScript bundles. It identified **0 critical**, **3 high**, **3 medium**, and **1 low** severity finding — most notably a **broken TLS certificate chain** (missing intermediate certificate causing browser warnings), the **absence of any HTTPS redirect or HSTS header** (allowing plaintext-HTTP usage), and the **complete absence of a Content Security Policy**.

On the positive side, the Laravel backend correctly issues **per-session randomised CSRF tokens** (in contrast to the static token observed on [CDSCO](./cdsco-security-analysis.md)) and ships cookies with `HttpOnly` and `SameSite=Strict` flags. The transport-layer issues, however, largely negate these backend protections.

## Risk Factors

- The HTTPS endpoint presents a certificate chain that fails verification (`unable to verify the first certificate`) — most browsers will display a "Not Secure" warning, training users to dismiss certificate errors
- The HTTP endpoint returns `200 OK` directly with no redirect to HTTPS; users typing `nppa.gov.in` into a browser may land on the plaintext version
- No HTTP Strict Transport Security (HSTS) header is set, so even a one-time HTTP visit can be downgraded indefinitely via an active network attacker
- No Content Security Policy header is set at all — there is no browser-enforced second line of defence against XSS
- All `<script>` and `<link>` tags in the homepage use `http://nppa.gov.in/...` URLs, creating **mixed-content** warnings on HTTPS and **MITM-injectable** assets on HTTP
- The `laravel-session` cookie is set with `HttpOnly; SameSite=Strict` but is **missing the `Secure` flag** — it can be transmitted in plaintext over HTTP
- The `XSRF-TOKEN` cookie (which Laravel reads back as a header on state-changing requests) is similarly missing the `Secure` flag
- The deprecated `X-XSS-Protection: 1; mode=block` header is enabled
- jQuery is on 3.6.1; the current 3.x branch is 3.7.1 — minor security updates have been missed

## Impact Scenarios

### Scenario: Active MITM on an HTTP Visiting Pharmacist

A pharmacist or drugs-control officer types `nppa.gov.in` into a browser on hotel WiFi, an airport network, or any hostile LAN. The browser tries HTTP first; the server returns `200 OK` with no redirect. An attacker on the same network can now rewrite the response in transit — injecting a malicious `<script>` tag, swapping the published drug price list, or spoofing a "ceiling price revision" notification. Because the real `laravel-session` cookie is also transmitted over HTTP (no `Secure` flag), the attacker can capture a legitimate session identifier and replay it later from a clean network.

### Scenario: TLS Warning Fatigue

When a user does reach the HTTPS endpoint, the browser displays a "Your connection is not private" or "Not Secure" warning because the Sectigo intermediate certificate is missing from the chain. Users who click through the warning to access drug price data are now trained to dismiss the same warning on the next phishing site they visit. For a regulator whose data is consumed daily by pharmacists, doctors, and pharma-industry employees, this is a meaningful security-cultural harm.

### Scenario: XSS Without a CSP Backstop

The portal renders drug names, firm names, batch numbers, and ceiling-price notifications — all of which originate from database content entered by NPPA staff or scraped from industry filings. Any unsanitised string that reaches the page as HTML can execute as JavaScript because there is no Content Security Policy restricting `script-src`. A malicious pharmaceutical firm employee (or a compromised one) who manages to inject a payload into a price-revision notification could harvest session cookies from every regulator, journalist, and competitor firm that subsequently views the notice.

### Scenario: Asset Substitution via HTTP

Because every `<script>` tag in the homepage uses `http://nppa.gov.in/...`, an active attacker on the network can replace any of the ~14 JavaScript bundles with arbitrary code. The browser, seeing HTTP URLs on an HTTP page, will execute the substituted code with no integrity check. There are no Subresource Integrity (SRI) hashes on any of the script tags, so substitution is completely silent.

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| 🟠 HIGH | Broken TLS Chain | HTTPS endpoint fails certificate verification — missing intermediate (Sectigo) certificate |
| 🟠 HIGH | No HTTPS Enforcement | HTTP returns 200 OK directly; no redirect to HTTPS, no HSTS header |
| 🟠 HIGH | Missing Content Security Policy | No CSP header of any kind set on responses |
| 🟡 MEDIUM | Cookie Missing Secure Flag | `laravel-session` and `XSRF-TOKEN` cookies both lack `Secure`, allowing plaintext transmission |
| 🟡 MEDIUM | Mixed-Content / HTTP Assets | All `<script>` and `<link>` URLs use `http://` even when the page is loaded over HTTPS |
| 🟡 MEDIUM | Deprecated Header | `X-XSS-Protection: 1; mode=block` enabled (modern guidance: `0`) |
| 🔵 LOW | Outdated Library | jQuery 3.6.1 (current is 3.7.1); minor security updates missed |

**Positive observations** (not counted as findings):

- ✅ Real per-session Laravel CSRF token (`<meta name="csrf-token">` with randomised value) — unlike CDSCO's static token
- ✅ `X-Frame-Options: DENY` (stronger than `SAMEORIGIN`)
- ✅ `X-Content-Type-Options: nosniff` present
- ✅ `Referrer-Policy: strict-origin-when-cross-origin` correct
- ✅ `Permissions-Policy: camera=(), microphone=(), geolocation=()` restrictive
- ✅ Cookies have `HttpOnly` (where applicable) and `SameSite=Strict`
- ✅ Laravel backend (modern, patchable framework) rather than a custom-rolled legacy CMS

## Why This Matters

NPPA publishes the prices of essential medicines — data that affects:

- **Patient out-of-pocket cost** at every pharmacy counter in India
- **Procurement decisions** by state drug authorities and hospital chains
- **Pharma company strategy** — pricing teams monitor NPPA notifications in real time
- **Investor sentiment** — listed pharma stocks move on NPPA ceiling-price revisions
- **Journalistic investigations** into overpricing and shortage

When a regulator in this position serves its data without a valid TLS chain, without HTTPS enforcement, without HSTS, and without a Content Security Policy, every visitor to the data — particularly pharmacists on shared networks and journalists on hostile networks — is at risk of receiving tampered pricing data. The downstream consequence of altered price data is direct financial harm to patients and to pharma companies, and corrosive loss of trust in the regulatory regime.

This analysis joins a series of security architecture reviews on Indian government digital infrastructure, including [Aadhaar/UIDAI](./aadhaar-uidai-security-analysis.md), [eTenders (CPPP)](./etenders-cppp-security-analysis.md), and [CDSCO](./cdsco-security-analysis.md).

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| **2026-06-18** | Internal analysis completed; findings logged in the security audit database |
| **(Pending)** | CERT-In disclosure to be filed with redacted technical details within 30 days |
| **(Pending)** | NPPA IT cell notification via secure channel |
| **2026-09-18** | 90-day responsible disclosure deadline; full technical detail publication |

## Recommendations

### Immediate (P0 — within 24 hours)

1. **Fix the TLS certificate chain** by configuring the Apache server to serve the full intermediate + root chain. The Sectigo intermediate certificate is freely downloadable; this is a configuration issue, not a reissuance.
2. **Add a `Strict-Transport-Security` header** with at least `max-age=31536000; includeSubDomains; preload` to HTTPS responses.
3. **Redirect all HTTP traffic to HTTPS** at the Apache vhost level (`Redirect permanent / https://nppa.gov.in/`).

### Short-term (P1 — within 7 days)

1. **Add the `Secure` flag** to both the `laravel-session` and `XSRF-TOKEN` cookies. Once HTTPS is enforced, this is a single Laravel config change (`'secure' => env('SESSION_SECURE_TOKEN', true)` in `config/session.php`).
2. **Switch all asset URLs to HTTPS** (or, better, use protocol-relative `//nppa.gov.in/assets/...` URLs or root-relative `/assets/...` URLs).
3. **Deploy a baseline Content Security Policy**: `default-src 'self'; object-src 'none'; frame-ancestors 'none'` is a safe starting point. Tighten `script-src` once inline scripts are addressed via nonces.
4. **Remove the `X-XSS-Protection` header** entirely (or set to `0`).
5. **Upgrade jQuery** from 3.6.1 to 3.7.1.

### Structural (P2 — within 90 days)

1. **Add Subresource Integrity (SRI) hashes** to every `<script>` and `<link rel="stylesheet">` tag.
2. **Migrate all third-party library loading to a self-hosted path** (e.g. download jQuery locally rather than loading from `code.jquery.com`) so that the CDN compromise threat is eliminated.
3. **Publish a `security.txt`** at `/.well-known/security.txt` with a clear vulnerability reporting path.
4. **Engage a CERT-In empanelled auditor** for an annual penetration test of the public surface, with the report published in summary form (redacted) so the public can see evidence of due diligence.
5. **Submit `nppa.gov.in` to the HSTS preload list** once HTTPS enforcement has been live for several weeks without regression.

---

*This analysis is part of an ongoing series on Indian government digital infrastructure security, published under a responsible-disclosure model with a 90-day embargo on technical detail.*
