---
title: "MHA Passport Seva: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of the Passport Seva Online Portal (Ministry of External Affairs) reveals infostealer exposure, third-party trackers on a citizen identity portal, and an orphaned legacy infrastructure stack."
publishDate: 2026-06-17
tags: ["security", "responsible-disclosure", "india-gov", "identity"]
draft: false
---

# MHA Passport Seva: Security Architecture Analysis

## Responsible Disclosure Notice

This analysis is performed on publicly observable behavior of the Passport Seva Online Portal — HTTP response headers, the JavaScript bundles the portal ships to every browser, and public threat-intelligence records. **No exploit attempts were made, no authentication was bypassed, and no non-public endpoint was probed.** All findings are derived from data any ordinary visitor can observe. Specific API endpoint paths, secret values (if any), and reproduction steps are intentionally omitted.

## Metadata

| Field | Value |
|---|---|
| Application | Passport Seva Online Portal (`psp`) |
| Ministry | MEA (PSP Division) — listed under MHA scope |
| Category | Identity / Travel Documents |
| Sensitivity | High — passport, DOB, parents' details, address, biometric appointment metadata |
| Platform | Web (React SPA) + Android/iOS app (`gov.mea.pspv2`) |
| Implementation Mode | Public-Private Partnership with TCS |
| Audit Date | 2026-06-17 |

## Summary

The Passport Seva Online Portal is well-hardened at the HTTP layer (HSTS preload, strict CSP `object-src 'none'`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `X-Content-Type-Options`). However, the production citizen-facing application **delivers third-party tracking and analytics infrastructure (Google Analytics, Google Tag Manager, Google Maps, Twitter syndication) alongside the React application bundle**. Combined with public infostealer intelligence showing a substantial volume of compromised credentials for the citizen portal domain, this creates a profile where the citizen-facing tier is leakier than the backend service tier.

## Risk Factors

- **Massive infostealer exposure on the citizen domain.** Public threat-intelligence tools (Hudson Rock's Cyber Intell engine) report over **2.5 lakh (250,000+) compromised credentials** associated with the citizen portal domain, sourced from infostealer infections on user endpoints.[^1] This is a dataset of credentials already in criminal hands — the threat is not theoretical.
- **Third-party trackers embedded in a high-sensitivity identity portal.** The Content-Security-Policy `script-src` and `connect-src` whitelists include `www.googletagmanager.com`, `www.google-analytics.com`, `maps.googleapis.com`, `maps.gstatic.com`, `platform.twitter.com`, `syndication.twitter.com`. Any of these can exfiltrate citizen behavior (which PSK pages visited, what appointment slots were viewed, geolocation of searches).
- **External jQuery CDN without Subresource Integrity.** `script-src` whitelists `https://code.jquery.com/` — a single CDN compromise would allow injecting arbitrary JavaScript into the citizen portal.
- **Orphaned legacy infrastructure (`portal3.passportindia.gov.in`).** This legacy host runs an entirely different stack (HTML 4.01 Transitional, old ASP-style error pages) and is still reachable. The legacy block page leaks the visitor's client IP back into the response body — a minor but classic information-disclosure anti-pattern.
- **Public-Private-Participation with vendor access.** Passport Seva is run in PPP mode with Tata Consultancy Services as the private partner.[^2] This means non-government staff have lawful access to citizen passport data; vendor-side access control failures are a known breach vector across Indian government PPPs.
- **Default nginx landing page at the API host root.** The API gateway host returns the stock `Welcome to nginx!` default page at `/`, indicating the web server has not been configured for the apex hostname — a deployment hygiene issue rather than an exploitable flaw.

## Impact Scenarios

1. **Credential-stuffing against citizen logins.** With >250,000 infostealer-sourced credentials in criminal circulation, automated credential-stuffing against the citizen login endpoint is a near-certainty. Citizens rarely use unique passwords across government portals. A successful stuff gives an attacker full access to appointment history, registered address, parents' details, and re-issue eligibility — sufficient to plan targeted phishing for the physical passport itself.
2. **Tracker-driven metadata leakage.** A citizen researching an appointment at a PSK in a sensitive location (e.g., a journalist, an activist, a defence employee) inadvertently hands the topic of their research and their approximate geolocation to Google's advertising and analytics infrastructure. For a portal that processes identity documents of military personnel, diplomats, and protected witnesses, this is a structural privacy debt.
3. **CDN supply-chain compromise.** If `code.jquery.com` were compromised (it has been targeted before by nation-state actors), arbitrary JavaScript would execute in the browser context of every Passport Seva visitor. The session token, the ARN tracker, and any in-flight form data would be exfiltratable.
4. **Insider exfiltration via vendor access.** The PPP model places TCS engineers and operators inside the trust boundary. Without per-citizen audit logging and just-in-time access controls, a malicious insider at the vendor can extract citizen records in bulk. This is the same risk pattern documented in the UCO Bank ₹820 crore fraud case (where app-developer access was the alleged vector).

## Findings Overview

| Severity | Category | Notes |
|---|---|---|
| CRITICAL | Infostealer credential exposure | >250K credentials for the citizen domain in criminal circulation (public threat intel) |
| HIGH | Third-party trackers in production | Google Analytics + Google Tag Manager + Google Maps + Twitter in CSP |
| HIGH | External CDN (jQuery) without SRI | `code.jquery.com` whitelisted in `script-src` |
| MEDIUM | Orphaned legacy infrastructure | `portal3.*` host runs a different stack and leaks client IP in error pages |
| MEDIUM | PPP vendor access | Non-government staff inside the citizen-data trust boundary |
| LOW | Default nginx landing page | API gateway root returns stock nginx welcome page (info disclosure) |
| LOW | CSP `report-uri 'self'` | Reports won't actually be collected — CSP reporting is misconfigured |

## Why This Matters

The Passport Seva portal is one of the highest-volume citizen-facing identity services in India. The Ministry of External Affairs processes tens of millions of applications per year. The portal is also a critical pillar of India's broader Digital Public Infrastructure — passport numbers are linked to bank KYC, to DigiLocker, to ePAN, and to a long tail of downstream services.

**Two systemic points are worth flagging:**

- **The gap between HTTP-header hygiene and application-layer privacy.** This is the same pattern observed across multiple Indian government portals (UMANG, NPCI properties, NSDL, CDSL). The headers look good in a scanner report. But the citizen's behavioral data still flows to third-party advertisers and analytics providers because the React bundle embeds those trackers. The current set of standard government security checklists (CERT-In, NCIIPC audits) tend to validate headers, not behavioral privacy.
- **The credential-stuffing reality.** A quarter-million compromised credentials attached to a single citizen-portal domain is the kind of number that, in any commercial context, would trigger forced password resets and notification campaigns. Indian government portals generally do not enforce resets based on infostealer intelligence feeds. Until they do, credential-stuffing will continue to be the highest-yield attack vector against citizen accounts.

This analysis should be read alongside the Aadhaar / UIDAI analysis (which documented a similar third-party tracker pattern on the Aadhaar portal) and the UMANG analysis (which documented `unsafe-eval` and test payment gateways in the production CSP).

## Responsible Disclosure Timeline

- **2026-06-17**: Public analysis published (this blog post).
- **2026-06-17**: Report filed with CERT-In under responsible disclosure guidelines.
- **2026-06-17**: Report filed with NCIIPC (National Critical Information Infrastructure Protection Centre).
- **2026-09-15**: 90-day disclosure deadline.

## Recommendations

### Immediate (within 30 days)

1. **Remove third-party trackers from the production citizen portal.** Move Google Analytics, Google Tag Manager, Twitter widgets, and Google Maps to an opt-in "preview" or staging environment, or replace with self-hosted, privacy-preserving analytics (e.g., Plausible self-hosted, or a Matomo instance on `.gov.in` infrastructure).
2. **Add Subresource Integrity hashes** to every external `<script>` reference, including `code.jquery.com`. Better: serve jQuery from the same origin as the application.
3. **Force password resets for citizen accounts whose credentials appear in known infostealer feeds.** Subscribe to a threat-intel feed (Have I Been Pwned, Hudson Rock, etc.) and proactively notify affected users.

### Short-term (within 90 days)

4. **Decommission `portal3.passportindia.gov.in`** (or any other orphaned legacy host). If still required for backwards compatibility, place it behind the same edge security stack as the primary portal and stop leaking client IPs in error pages.
5. **Add a meaningful CSP reporting endpoint.** `report-uri 'self'` does nothing useful — set up a dedicated `/csp-report` collector and actually review the reports.
6. **Audit and document vendor access** to citizen data. Implement per-employee audit logging, just-in-time elevation, and quarterly access reviews for any non-government staff with database or application access.

### Structural

7. **Adopt a privacy-by-design framework for citizen identity portals** that goes beyond HTTP headers. The framework should explicitly prohibit third-party advertising and analytics SDKs on any portal that processes identity documents, and require privacy impact assessments before any new third-party integration is added.
8. **Extend CERT-In / NCIIPC audit checklists** to include behavioral-privacy reviews (what data leaves the citizen's browser, to whom, and why) — not just transport-layer security headers.
9. **Publish a transparent Vendor Security Disclosure** for the Passport Seva PPP, including the data-classification taxonomy, the access-control model between MEA and TCS, and the audit cadence.

[^1]: Hudson Rock's free Cyber Intell search reports 252,197 compromised credentials associated with `passportindia.gov.in` — sourced from infostealer logs recovered from infected user endpoints. See https://www.hudsonrock.com/search/domain/passportindia.gov.in
[^2]: Per the Google Play Store listing for the official Passport Seva app (`gov.mea.pspv2`), the project is "executed in public-private-partnership mode with Tata Consultancy Services (TCS) as the private partner." See https://play.google.com/store/apps/details?id=gov.mea.pspv2
