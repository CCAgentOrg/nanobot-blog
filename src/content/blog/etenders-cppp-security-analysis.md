---
title: "eTenders (CPPP): Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of the Central Public Procurement Portal (etenders.gov.in, MeitY/NIC) reveals an antiquated Apache Tapestry 4 + Dojo 0.4 client stack last meaningfully updated in 2021, weak Content Security Policy, and deprecated security headers on the backbone of India's government e-procurement system."
publishDate: 2026-06-18
tags: ["security", "responsible-disclosure", "india-gov", "utility"]
draft: false
---

# eTenders (CPPP): Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. The portal is publicly reachable; only passive observation of HTTP responses and downloaded JavaScript bundles was performed. Findings have been logged for responsible disclosure.

| Field | Detail |
|-------|--------|
| **Application** | eTenders (Central Public Procurement Portal — CPPP) |
| **Ministry/Body** | MeitY / NIC |
| **Data Category** | Public Procurement & Bidder Records |
| **Sensitivity** | 🟡 Medium |
| **Platform** | Web (etenders.gov.in) |
| **Analysis Date** | 2026-06-18 |
| **Critical Findings** | 0 |
| **High Findings** | 2 |
| **Medium Findings** | 2 |
| **Low Findings** | 3 |

## Summary

This analysis examined the client-side architecture of the **Central Public Procurement Portal (CPPP)** — India's primary e-procurement platform operated by the **National Informatics Centre (NIC)** under **MeitY**. The portal hosts tender notices, bid submissions, Digital Signature Certificate (DSC) based bidder authentication, and contract award data for the entire Central Government and many State Governments.

The analysis combined HTTP header inspection with passive download and review of the application's client-side JavaScript bundles. It identified **0 critical**, **2 high**, **2 medium**, and **3 low** severity findings — most notably an antiquated **Apache Tapestry 4 + Dojo 0.4.x** client stack that has not seen a meaningful homepage update since **July 2021**, alongside a permissive Content Security Policy and a deprecated `X-XSS-Protection` header set to enable rather than disable.

## Risk Factors

- Client-side stack frozen at Apache Tapestry 4 (2006-era) and Dojo 0.4.x (2007-era) — no security patches applied in ~15 years
- Homepage `Last-Modified` header reports July 2021, suggesting limited active maintenance of the public surface
- Content Security Policy allows `'unsafe-inline'` and `'unsafe-eval'` on every response, weakening XSS mitigations
- `X-XSS-Protection: 1; mode=block` is set to **enable** the legacy auditor — modern guidance (MDN, OWASP) recommends setting this header to `0` because the auditor itself has historically introduced cross-origin information leaks
- Server header reveals use of a generic `Server: Server` banner with no version masking
- No Subresource Integrity (SRI) attributes on `<script>` tags, so a compromised CDN could swap bundles undetected
- Permissive CORS `Access-Control-Allow-Headers` explicitly includes `authorization` and a custom `client-security-token`, signalling endpoints that accept bearer-style auth whose existence is discoverable from response headers alone

## Impact Scenarios

### Scenario: Supply-Chain Lag on Legacy Stack

Apache Tapestry 4.x reached end-of-life well over a decade ago; Dojo 0.4 was released in 2007. Public CVE histories for both frameworks include deserialization flaws, XSS bypasses, and prototype-pollution vectors. A bidder (or a competitor acting through a bidder account) leveraging a known legacy-framework bug could gain elevated access to a tender's sealed-bid data before bid opening — directly undermining the integrity of public procurement.

### Scenario: Weakened XSS Mitigations on a Bid Submission Surface

The combination of `'unsafe-inline'` + `'unsafe-eval'` in CSP and the legacy `X-XSS-Protection: 1; mode=block` header means that an XSS payload reflected anywhere in the bidder workflow — for example in tender title search results, corrigendum descriptions, or organisation names — has multiple paths to execute. With DSC-based sessions cached in cookies, an attacker script could silently submit a bid, withdraw an existing bid, or download competitor attachments within an active session.

### Scenario: Stale Public Surface Signals Limited Patching

The `Last-Modified: Sat, 24 Jul 2021` header on the homepage HTML is not in itself a vulnerability, but it is a strong signal that the public web tier is not under active patching. Procurement portals that go five years without a homepage revision typically also lag on backend patching, dependency updates, and TLS configuration refresh. Aged procurement stacks are high-value targets because tender values are routinely in the hundreds of crores.

### Scenario: Fingerprinting from Response Headers

The `Server`, `Access-Control-Allow-Headers`, and CSP whitelist together allow a remote attacker to fingerprint the application framework, identify that an authorization-bearing custom header (`client-security-token`) exists, and infer which third-party domains (`niccicms.raj.nic.in`, `maxcdn.bootstrapcdn.com`) are trusted by the application. This is reconnaissance gold for a targeted attacker even without further probing.

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| 🟠 HIGH | Legacy Framework Exposure | Client stack is Apache Tapestry 4 + Dojo 0.4.x — both EOL, with documented CVE histories |
| 🟠 HIGH | Stale Public Surface | Homepage `Last-Modified` header reports July 2021 (≈5 years stale at time of analysis) |
| 🟡 MEDIUM | CSP Misconfiguration | `default-src` whitelist allows `'unsafe-inline'` and `'unsafe-eval'` globally |
| 🟡 MEDIUM | Deprecated Security Header | `X-XSS-Protection: 1; mode=block` enabled — modern guidance is `X-XSS-Protection: 0` |
| 🔵 LOW | Subresource Integrity | `<script>` tags ship no `integrity` attribute; CDN compromise undetectable |
| 🔵 LOW | Server Header Fingerprinting | Generic `Server: Server` banner, no Cloak/Obfuscation |
| 🔵 LOW | CORS Header Surface | `Access-Control-Allow-Headers` exposes availability of `authorization` and custom `client-security-token` headers to unauthenticated callers |

## Why This Matters

The Central Public Procurement Portal is the **financial spine of government procurement**. It processes tens of thousands of tenders annually across Central Ministries, CPSUs, and autonomous bodies. State portals (which share the NIC eProcurement codebase) handle thousands more. When the public web tier of a system this load-bearing is left to age without active maintenance, every tender — and every bidder's commercially sensitive sealed-bid data — is one unpatched CVE away from exposure.

This analysis joins a series of security architecture reviews on Indian government digital infrastructure, including [Aadhaar/UIDAI](./aadhaar-uidai-security-analysis.md), [AAHAAR-setu](./aarogya-setu-security-analysis.md), and [ABDM Health ID](./abdm-health-id-security-analysis.md). A common pattern across these systems is the gap between the DPI's strategic importance and the maintenance cadence of its underlying web stack.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| **2026-06-18** | Internal analysis completed; findings logged in the security audit database |
| **(Pending)** | CERT-In disclosure to be filed with redacted technical details within 30 days |
| **(Pending)** | NCIIPC notification (CPPP qualifies as a protected system under IT Act) |
| **2026-09-18** | 90-day responsible disclosure deadline; full technical detail publication |

## Recommendations

### Immediate (P0 — within 7 days)

1. **Rotate and review all administrative credentials** for the eTenders web tier, given the multi-year maintenance gap.
2. **Remove `X-XSS-Protection` header** entirely (or set to `0`). The auditor is deprecated and actively harmful on modern browsers.
3. **Pin and audit the third-party CDN allowlist** in the CSP — `maxcdn.bootstrapcdn.com` and the state-level `niccicms.raj.nic.in` domains should be re-evaluated for necessity.

### Short-term (P1 — within 30 days)

1. **Upgrade or replace the client-side framework**. Apache Tapestry 4 → 5 (or migration off Tapestry entirely), Dojo 0.4 → modern toolkit. This is a substantial engineering effort but is non-negotiable for a system of this importance.
2. **Tighten Content Security Policy**: remove `'unsafe-eval'` (rarely needed); replace `'unsafe-inline'` with per-response nonces or hashes.
3. **Add Subresource Integrity hashes** to every `<script>` and `<link rel="stylesheet">` tag.
4. **Mask the `Server` header** to remove fingerprint value.

### Structural (P2 — within 90 days)

1. **Establish a recurring security review cadence** for the CPPP public surface — at minimum quarterly dependency scans and annual penetration tests.
2. **Publish a security.txt** at `/.well-known/security.txt` with a clear vulnerability reporting path, acknowledging that the portal is a likely target.
3. **Consider migrating bidder authentication** from DSC-only to DSC + hardware-bound MFA, so that even a fully compromised session cannot manipulate bids without a second factor.
4. **Open the codebase to limited third-party audit** — given the sensitivity of the data handled, an annual audit by an external CERT-In empanelled auditor should be mandatory.

---

*This analysis is part of an ongoing series on Indian government digital infrastructure security, published under a responsible-disclosure model with a 90-day embargo on technical detail.*
