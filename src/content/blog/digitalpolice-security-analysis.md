---
title: "Digital Police (CCTNS): Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Digital Police / CCTNS / National Cyber Crime Reporting Portal (MHA) reveals internal IP addresses hardcoded in production HTML, a permissive Content-Security-Policy allowing any origin in script-src, sample IIS tutorial headers shipped to production, and an HTTPS-to-HTTP downgrade redirect on the citizen services host."
publishDate: 2026-06-17
tags: ["security", "responsible-disclosure", "india-gov", "identity"]
draft: false
---

# Digital Police (CCTNS): Security Architecture Analysis

## Responsible Disclosure Notice

This analysis is based on publicly observable HTTP responses, security headers, and HTML source code that the Digital Police / National Cyber Crime portals serve to every visitor. **No authentication was bypassed, no non-public endpoint was probed, and no exploit attempt was made.** All findings can be reproduced by any visitor with a browser or `curl`. Specific internal hostnames that appear in the public HTML are referenced in aggregate; no insider documentation or non-public topology is disclosed.

## Metadata

| Field | Value |
|---|---|
| Application | Digital Police (CCTNS) + National Cyber Crime Reporting Portal |
| Ministry | Home Affairs — NCRB / Cyber Crime (Citizen Services) |
| Maintained By | National Informatics Centre (NIC) / NCRB |
| Category | Law Enforcement / Citizen Reporting |
| Sensitivity | Critical — FIR data, crime records, victim complaints, suspect identities, 28 crore CCTNS records in scope |
| Platform | Web (IIS/10.0 on cybercrime host) + Android app (`.gov.digitalpolicenew`) |
| Audit Date | 2026-06-17 |

## Summary

The Digital Police umbrella (the master citizen-facing portal for the Crime & Criminal Tracking Network & Systems / CCTNS programme, plus the National Cyber Crime Reporting Portal) sits on the most sensitive end of the Indian government's citizen-service spectrum: it processes cybercrime complaints from individual victims, surfaces crime records from the CCTNS database of ~28 crore (280 million) records, and acts as the public gateway into the law-enforcement data backbone. Despite that sensitivity, the production deployment exhibits **internal IP addresses hardcoded into the public HTML, a Content-Security-Policy whose `script-src` whitelists any `http://*` and `https://*` origin, sample IIS tutorial headers (`X-Custom-Name1: MyCustomValue1`) shipped to production, and an HTTPS-to-HTTP downgrade redirect on the citizen-services hostname.**

## Risk Factors

- **Internal IPv4 addresses hardcoded in production HTML.** The Digital Police homepage embeds references to internal (RFC1918 private-range) IPv4 addresses — including a `/crimac/login` endpoint on an internal host and a `:8080/center` endpoint on another — directly in the rendered page. Any visitor can read these addresses via "View Source." Exposing internal topology is a baseline reconnaissance gift to any hostile party planning a follow-on attack against the law-enforcement network.
- **CSP `script-src` allows any origin.** The Cyber Crime Reporting Portal's `Content-Security-Policy-Report-Only` header contains `script-src 'self' http://* https://*` — effectively allowing any external origin to inject script, defeating the entire purpose of a CSP. The policy is also `Report-Only`, so even the protections that exist are not enforced.
- **Sample IIS tutorial headers in production.** The Cyber Crime Portal returns HTTP response headers named `X-Custom-Name1: MyCustomValue1` and `X-Custom-Name2: MyCustomValue2` — these are the literal placeholder names used by Microsoft's IIS `<customHeaders>` documentation example. Their presence in production is strong evidence that the deployment was never reviewed after the boilerplate configuration was copied.
- **HTTPS-to-HTTP downgrade on citizen services.** The `digitalpolicecitizenservices.gov.in` HTTPS endpoint issues a `302` redirect to an `http://` URL. The downgrade throws away transport security at the citizen-facing tier; any network-position adversary (rogue Wi-Fi, ISP-level interference, hostile CA-issued certificate substitute) can intercept the post-redirect traffic.
- **No HSTS, no CSP, no X-Frame-Options on `digitalpolice.gov.in`.** The primary Digital Police host returns essentially no security headers. The page can be iframed from any origin (clickjacking), lacks transport-security preload, and places no restriction on inline or third-party script execution.
- **Massive sensitive-data scope.** The CCTNS programme contains case-level details of effectively every crime recorded in India — roughly 28 crore records — along with complainant identities, suspect information, FIR references, and court-linkage data. The blast radius of any successful account-takeover or injection attack against this stack is correspondingly large.
- **Programmatic integration with state police networks.** CCTNS is federated across all State/UT police data centres. Findings on the central portal often have analogues at the state-tier CCTNS nodes, which are individually operated and unevenly hardened.

## Impact Scenarios

1. **Internal-network reconnaissance via public HTML.** A hostile party planning a targeted intrusion into the police network can harvest the internal IPs directly from `digitalpolice.gov.in`'s homepage — no reconnaissance tooling or scanner required. Combined with knowledge of the `/crimac/login` path, an attacker who later obtains any foothold on the internal network has a precise target for lateral movement.
2. **Script-injection via permissive CSP.** Because `script-src` whitelists `https://*`, any compromise of an attacker-controlled HTTPS host — or any third-party JavaScript provider that the citizen portal happens to load — allows arbitrary script execution in the context of the Cyber Crime Portal. A complaint-status page that loads attacker-controlled script can exfiltrate complaint text, victim identity, and uploaded evidence.
3. **Clickjacking against complaint filing.** With no `X-Frame-Options` or `frame-ancestors` directive, a hostile site can transparently overlay the Digital Police portal and trick a visitor into clicking through a complaint submission, evidence upload, or status check.
4. **Man-in-the-middle on the citizen-services downgrade.** A complainant filing a cybercrime report from a public Wi-Fi network can have their post-redirect HTTP traffic intercepted. The complaint text, supporting documents, and any session identifier are exposed in cleartext on the wire.
5. **Reputational damage from sample-header leak.** The `X-Custom-Name1: MyCustomValue1` header is the kind of artefact that gets screenshotted and circulated as evidence of a deployment pipeline gap. For the citizen-facing portal of the agency responsible for cybercrime reporting, this is especially damaging.

## Findings Overview

| Severity | Category | Notes |
|---|---|---|
| CRITICAL | Internal IP addresses in production HTML | Private-range IPv4 hosts embedded in Digital Police homepage |
| CRITICAL | Permissive CSP (any `https://*` in `script-src`) | Cyber Crime Portal CSP `Report-Only` with `script-src 'self' http://* https://*` |
| HIGH | Sample/tutorial IIS headers in production | `X-Custom-Name1: MyCustomValue1` shipped to every visitor |
| HIGH | HTTPS-to-HTTP downgrade redirect | Citizen services host 302s HTTPS to HTTP |
| HIGH | Missing baseline security headers | No HSTS, CSP, or X-Frame-Options on `digitalpolice.gov.in` |
| MEDIUM | 28-crore CCTNS data scope | High-value target for any successful injection |
| MEDIUM | Federated state-tier risk | Central findings likely mirror state CCTNS nodes |
| LOW | `Content-Security-Policy-Report-Only` mode | Even the permissive CSP is not enforced |

## Why This Matters

Digital Police / CCTNS is the digital backbone of Indian policing. It is the system that surfaces case data to magistrates, that feeds the National Judicial Data Grid via the court-linkage pipeline, and that handles the citizen-facing reporting path for cybercrime — itself one of the fastest-growing categories of crime in India. The Cyber Crime Reporting Portal in particular handles complainant PII, evidence uploads, and victim contact details for the population most vulnerable to online fraud.

The combination of **internal IPs in public HTML + permissive CSP + sample IIS headers in production + HTTPS-to-HTTP downgrade + no baseline headers on the primary host** is not a single failure but a stack of independent gaps. Each one alone is a moderate finding; together they paint a picture of a deployment pipeline where boilerplate configuration was promoted to production without security review. The bar for contemporary government-portal security — modern CSP, HSTS preload, framed-ancestors restrictions, header hygiene — is well documented across the international public-sector literature; the Digital Police stack falls short of it on multiple axes simultaneously.

This analysis should be read alongside the broader pattern across Indian government portals: the missing-header pattern is the same gap flagged in the **eCourts** analysis, the internal-IP-leakage pattern echoes findings on multiple state-tier CCTNS nodes, and the permissive-CSP `script-src 'self' http://* https://*` pattern is the same anti-pattern documented in the **UMANG** and **NSDL e-Services** analyses.

## Responsible Disclosure Timeline

- **2026-06-17**: Public analysis published (this blog post).
- **2026-06-17**: Report filed with CERT-In under responsible disclosure guidelines.
- **2026-06-17**: Report filed with NCRB / MHA (Cyber Crime).
- **2026-06-17**: Report filed with NCIIPC (CCTNS is critical-information-infrastructure).
- **2026-09-15**: 90-day disclosure deadline.

## Recommendations

### Immediate (within 30 days)

1. **Remove internal IP addresses from public HTML.** Audit `digitalpolice.gov.in` rendered output and strip every reference to RFC1918 ranges, internal hostnames, and internal service paths (`/crimac/`, `/center`, `:8080` etc.). Replace any in-page references to internal services with proper reverse-proxy paths served from the public origin.
2. **Replace the permissive CSP.** Drop `http://*` and `https://*` from `script-src`. Move from `Content-Security-Policy-Report-Only` to an enforced `Content-Security-Policy`, starting with `default-src 'self'` and whitelisting only the minimum necessary origins.
3. **Strip sample IIS headers.** Remove the `X-Custom-Name1` / `X-Custom-Name2` headers (and review all `<customHeaders>` entries in the IIS configuration for other boilerplate artefacts).

### Short-term (within 90 days)

4. **Eliminate the HTTPS-to-HTTP downgrade.** The `digitalpolicecitizenservices.gov.in` host must serve HTTPS end-to-end; the 302-to-HTTP redirect is a transport-security failure. Add HSTS with `includeSubDomains` and a long `max-age`.
5. **Add baseline security headers to `digitalpolice.gov.in`.** At minimum: HSTS preload, `X-Frame-Options: DENY` (or `frame-ancestors 'none'` in CSP), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` or `strict-origin-when-cross-origin`.
6. **Implement a CSP reporting endpoint** that actually collects and triages violation reports. Today's `Report-Only` setup discards the signals that would otherwise flag injection attempts.

### Structural

7. **Independent third-party penetration test** covering the CCTNS-routed endpoints surfaced from the public portal, the citizen-complaint upload path, and the cross-origin integrations with state CCTNS nodes.
8. **Deployment-pipeline review.** The presence of sample IIS headers and internal IPs in production HTML is evidence that the path from development to production does not include a security review step. Add a pre-production gate that rejects deployments containing placeholder values, internal network references, or missing baseline headers.
9. **Publish a `security.txt`** on `digitalpolice.gov.in` and `cybercrime.gov.in` so researchers have a clear, accountable contact path for future disclosures. Currently neither host publishes one.
