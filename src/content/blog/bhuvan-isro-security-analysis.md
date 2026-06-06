---
title: "Bhuvan ISRO: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Bhuvan (ISRO's geoportal) reveals a public CORS proxy in the CSP connect-src directive, universal unsafe-inline/unsafe-eval, and extensive infrastructure exposure through the Content Security Policy."
publishDate: 2026-06-06
tags: ["security", "responsible-disclosure", "india-gov", "isro", "gis", "csp", "nextjs"]
draft: false
---

## Responsible Disclosure Notice

This analysis describes architectural weaknesses discovered through passive inspection of publicly accessible HTTP headers. No exploit steps, internal system access, or data exfiltration was performed.

---

## Metadata

| Field | Value |
|-------|-------|
| **Target** | Bhuvan (ISRO Geoportal) |
| **Ministry** | DST / ISRO |
| **Category** | Utility (Geospatial/GIS) |
| **Sensitivity** | Medium-High (satellite imagery, government GIS data, state databases) |
| **Platform** | Web (Next.js on Apache) |
| **Analysis Date** | 2026-06-06 |
| **Critical** | 1 |
| **High** | 2 |
| **Medium** | 2 |
| **Low** | 3 |

---

## Summary

Bhuvan, ISRO's Indian Geoportal providing satellite imagery and GIS services, runs a Next.js frontend on Apache. While the site has HSTS with preload and Permissions-Policy configured, its Content Security Policy contains a critical misconfiguration: `cors-anywhere.herokuapp.com` is whitelisted in the connect-src directive. This is a public CORS proxy that could enable Server-Side Request Forgery (SSRF) or data exfiltration through an uncontrolled third-party service. Additionally, every CSP directive includes `unsafe-inline` and `unsafe-eval`, effectively neutralizing the CSP's protections.

---

## Impact Scenarios

### Scenario 1: Data Exfiltration via CORS Proxy

The CSP explicitly allows connections to `cors-anywhere.herokuapp.com`, a public CORS proxy. An attacker who compromises any script on the Bhuvan page (via XSS, which is enabled by `unsafe-inline`/`unsafe-eval`) could route requests through this proxy to bypass same-origin policies. Geospatial data, API tokens, or session credentials could be silently forwarded to an attacker-controlled endpoint through the whitelisted proxy.

*Impact*: Exfiltration of sensitive geospatial data, API keys for MapMyIndia, or session tokens through a trusted CSP pathway.

### Scenario 2: XSS via Negated CSP

With `unsafe-inline` and `unsafe-eval` in every directive, the CSP provides no protection against cross-site scripting. Any injected script — whether through a compromised third-party dependency (OpenLayers, MapMyIndia SDK, Highcharts) or a direct injection vector — would execute freely.

*Impact*: Full page compromise including access to mapping data, API credentials, and user sessions.

---

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| **CRITICAL** | CORS Proxy in CSP | `cors-anywhere.herokuapp.com` whitelisted in connect-src — public CORS proxy enables SSRF/data exfiltration |
| **HIGH** | Negated CSP | `unsafe-inline` + `unsafe-eval` in ALL directives — CSP provides zero XSS protection |
| **HIGH** | Infrastructure Exposure | CSP reveals: MapMyIndia APIs, Telangana state databases (tsicaddb.cgg.gov.in, tsdps.telangana.gov.in), WebSocket endpoint, Bhashini translation, IPRC |
| **MEDIUM** | Next.js Detection | `X-Powered-By: Next.js` header + Turbopack chunks reveal framework and build system |
| **MEDIUM** | CORS on Redirect | Access-Control-Allow-Methods/Headers exposed on 302 redirect responses |
| **LOW** | Duplicate CSP | CSP header appears twice in responses |
| **LOW** | Mixed Content | `http://*.nrsc.gov.in` in img-src alongside HTTPS sources |
| **LOW** | Server Disclosure | Apache server header revealed |

---

## Recommendations

### Immediate

1. **Remove `cors-anywhere.herokuapp.com` from connect-src** — This is a public, uncontrolled proxy. If cross-origin requests are needed, implement a controlled server-side proxy.
2. **Remove `unsafe-inline` and `unsafe-eval`** — Use nonce-based CSP with proper script/style hashing.

### Short-term

3. Remove `X-Powered-By: Next.js` header
4. Consolidate duplicate CSP headers into one
5. Convert `http://*.nrsc.gov.in` to HTTPS-only in img-src

### Structural

6. Implement CSP reporting to monitor for policy violations
7. Conduct security review of all whitelisted third-party domains
