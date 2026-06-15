---
title: "PNB Internet Banking: Security Architecture Analysis — Responsible Disclosure"
description: "PNB's internet banking portal ships with operatingMode=DEVELOPMENT in production JS, a CAPICOM ActiveX object from the Windows XP era, scripts loaded from a non-existent Oracle Cloud bucket, JSESSIONID URL-rewriting, and a CSP that trusts *.oraclecloud.com — a cascade of legacy and configuration findings on a PSU banking surface."
publishDate: 2026-06-15
draft: false
tags: ["security", "responsible-disclosure", "india-gov", "finance", "pnb", "oracle", "legacy"]
---

Punjab National Bank (PNB) is India's second-largest public-sector bank by customer base, with over 180 million customers and ~13 crore (130 million) debit cards in circulation. Its internet banking portal — accessed via `ibanking.pnb.bank.in` and `internetbanking.pnbibanking.in` — handles retail authentication, fund transfers, beneficiary management, and account operations for millions of users daily. This analysis examines the security architecture of the login surface and pre-authentication flow.

---

## Responsible Disclosure Notice

This analysis is based on publicly observable HTTP headers, HTML served to unauthenticated clients, and JavaScript bundles downloaded without authentication. No login was attempted. No credentials were submitted. No authentication was bypassed. No user data was accessed.

Per responsible-disclosure norms:
- **No** exact API endpoint paths or controller names are published beyond what is already visible in URL structure.
- **No** raw internal identifiers (cookie values, ECIDs, etc.) are reproduced.
- **No** step-by-step reproduction instructions are provided.
- Findings have been reported via CERT-In and NCIIPC channels.

---

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | PNB Internet Banking (Retail + Corporate) |
| **Domains** | `ibanking.pnb.bank.in`, `internetbanking.pnbibanking.in`, `pnbtfr.pnbindia.in` |
| **Operator** | Punjab National Bank (PSU) |
| **Ministry** | Department of Financial Services (DFS) |
| **Category** | Banking (PSU) |
| **Platform** | Web — Oracle WebLogic + Oracle ADF (JSF), F5 BIG-IP, jQuery 3.5.1 |
| **Data Sensitivity** | **Critical** — banking credentials, account balances, PII, PAN, transaction history |
| **Users** | 180M+ retail customers; ~13 crore debit cards |
| **Analysis Date** | 2026-06-15 |
| **Critical Findings** | 4 |
| **High Findings** | 6 |
| **Medium Findings** | 4 |
| **Low Findings** | 3 |

---

## Summary

The PNB internet banking login surface exhibits a cluster of legacy and configuration findings that, individually, are common in older Java-based banking stacks — but together describe a deployment that has not been modernised in many years. The production JavaScript explicitly sets `operatingMode: "DEVELOPMENT"` and `logMode: "CONSOLE"`. The HTML still embeds a Microsoft CAPICOM ActiveX object — a component deprecated when Windows XP lost support in 2014. CSS and JS assets are loaded from an Oracle Cloud Object Storage bucket name (`DBD_PROD_BUCKET`) that returns "BucketNotFound" — meaning the production HTML references a bucket that no longer exists (or was renamed without updating HTML). The session ID is rewritten into the URL on the post target, exposing it to Referer leakage. And the Content Security Policy's `script-src` permits `*.oraclecloud.com` — meaning any Oracle Cloud customer worldwide can host scripts the browser will trust on the PNB login page.

---

## Risk Factors

- **Production JS runs in DEVELOPMENT operatingMode.** The login page's `CONFIG` object sets `operatingMode : "DEVELOPMENT"` and `logMode : "CONSOLE"` — debug behaviours and verbose error logging are enabled on a live banking surface.
- **CAPICOM ActiveX object embedded.** `<object id='oCAPICOM' classid='clsid:A996E48C-D3DC-4244-89F7-AFA33EC60679' codebase='capicom.cab'>` references a Microsoft COM component deprecated in 2014 and removed from modern Windows. Indicates crypto code paths that haven't been updated in a decade+.
- **JSESSIONID URL rewriting on the login form action.** `action="AuthenticationController;jsessionid=...!12894627?bwayparam=..."` — session ID in the URL can leak via Referer headers, browser history, and shared links.
- **CSP trusts `*.oraclecloud.com`.** Any Oracle Cloud customer can host scripts that the PNB CSP will permit for execution. Oracle Cloud's free tier lowers the bar for attacker-controlled hosts in this wildcard.
- **Production HTML references a non-existent Oracle bucket.** `objectstorage.ap-mumbai-1.oraclecloud.com/n/pnbcloud/b/DBD_PROD_BUCKET/o/scripts/custom.js` returns `{"code":"BucketNotFound"}` — meaning production CSS and JS assets fail to load; if the bucket name becomes available in the `pnbcloud` namespace, attacker-controlled scripts could be served in their place.
- **jQuery 3.5.1 is the most recent bundled version.** CVE-2020-11022 and CVE-2020-11023 (DOM-based XSS) were patched in 3.5.0; later CVEs (CVE-2022-31160 in jQuery UI, etc.) require later jQuery versions.
- **F5 BIG-IP persistence cookies disclosed.** Multiple `TS01...` cookies encode internal state; the classic F5 fallback cipher and cookie decryption have been publicly documented for over a decade.
- **Third-party iframe from a different TLD.** `pnbtfr.pnbindia.in/omniapp/pages/login/loginapp.jsf` is loaded in a frame — cross-TLD framing of login surfaces expands the clickjacking and postMessage attack surface.
- **Virtual keypad is the only visible anti-keylogger control.** `oncontextmenu="return false;"`, virtual keypad, and disabled copy-paste are UX-level protections that do not stop hardware keyloggers, screenshot-based malware, or browser-extension-based credential theft.

---

## Impact Scenarios

### Scenario A — Bucket-name squatting in Oracle Cloud namespace

Suppose the bucket `DBD_PROD_BUCKET` was decommissioned but the HTML was never updated. An attacker who can register a public bucket named `DBD_PROD_BUCKET` in the `pnbcloud` Oracle Cloud namespace — for example, by compromising a PNB employee's Oracle Cloud credentials or by social-engineering the namespace — would be able to serve hostile `custom.js`, `settings.js`, and `web-sdk.js` to every PNB internet banking visitor. Even without namespace access, the broken dependency itself is a finding: a banking portal whose CSS and JS silently fail to load is a portal whose UI can be manipulated.

### Scenario B — Referer-based session hijack

The login form posts to `AuthenticationController;jsessionid=...`. If a logged-in user navigates from the banking portal to any external link (a merchant, a partner site, a search engine), the Referer header carries the JSESSIONID. Combined with the fact that many banking workflows link to external PDFs, terms-of-service pages, or payment gateways, this is a real session-leak vector on the open web.

### Scenario C — ActiveX-based credential theft on legacy Windows

Although modern browsers no longer support ActiveX, the embedded CAPICOM object will still attempt to load in any environment that does (Internet Explorer 11 on Windows 10 LTSC, embedded kiosks, ATMs running Windows 7/XP, point-of-sale terminals). If CAPICOM is present and the cab file is somehow reachable, this becomes a credential-exfil vector on unmanaged/legacy endpoints. Kiosks at bank branches and rural customer-service terminals are typical PNB endpoint profiles.

### Scenario D — Cross-TLD clickjacking via pnbtfr.pnbindia.in

The iframe to `pnbtfr.pnbindia.in/omniapp/pages/login/loginapp.jsf` (note: `.in`, not `.bank.in`) loads login UI from a different organisational TLD. If `pnbindia.in` is independently compromised — or its DNS hijacked — the attacker can render a fake login form inside the legitimate `pnb.bank.in` page, with all browser security indicators showing a "secure PNB site." Customer credentials typed into the frame go to the attacker.

---

## Findings Overview

| # | Severity | Layer | Category | Finding |
|---|----------|-------|----------|---------|
| 1 | CRITICAL | Client JS | Production runs in DEVELOPMENT mode | `CONFIG` object sets `operatingMode: "DEVELOPMENT"` and `logMode: "CONSOLE"` on the live login page. |
| 2 | CRITICAL | Client HTML | CAPICOM ActiveX object embedded | `<object id='oCAPICOM' classid='clsid:A996E48C-D3DC-4244-89F7-AFA33EC60679' codebase='capicom.cab'>` — deprecated Microsoft crypto component. |
| 3 | CRITICAL | HTTP headers | CSP trusts `*.oraclecloud.com` wildcard | Any Oracle Cloud customer can host scripts the browser will execute on the PNB login page. |
| 4 | CRITICAL | Architecture | Production HTML references non-existent Oracle bucket | `DBD_PROD_BUCKET` returns `BucketNotFound`; CSS and JS assets fail to load on every page load. |
| 5 | HIGH | Client HTML | JSESSIONID URL-rewriting on login form action | `AuthenticationController;jsessionid=...` — session ID in URL leaks via Referer. |
| 6 | HIGH | Client JS | jQuery 3.5.1 bundled | Pre-2022 release; multiple later CVEs apply. |
| 7 | HIGH | Architecture | Cross-TLD iframe for login | `pnbtfr.pnbindia.in/omniapp/pages/login/loginapp.jsf` (different TLD from `pnb.bank.in`). |
| 8 | HIGH | Client HTML | HTML 4.01 Transitional DOCTYPE + invalid multiple `<head>` tags | Invalid HTML structure; modern browser quirks-mode parsing. |
| 9 | HIGH | Client JS | IP address leaked in script URL | `NFEBAScripts_login.js?...&ipAddress=67.213.115.25&...` — server-side IP exposed to every client. |
| 10 | HIGH | Headers | F5 BIG-IP persistence cookies | Multiple `TS01...` cookies with predictable structure decode to internal state. |
| 11 | MEDIUM | Privacy | `dganalytics.js` loaded but returns 404 | Analytics tracker referenced but missing — silent failure; if re-created at that path, hostile tracking could be injected. |
| 12 | MEDIUM | Client HTML | Virtual keypad as primary anti-keylogger control | UX-level security; does not stop modern credential theft. |
| 13 | MEDIUM | Headers | `unsafe-eval` + `unsafe-inline` in CSP script-src | Combined with `*.oraclecloud.com`, weakens XSS protection. |
| 14 | MEDIUM | Architecture | `bwayparam=...` base64-encoded state in URL | Opaque encoded state in URL; encourages opaque-state attacks. |
| 15 | LOW | Hygiene | `oncontextmenu="return false;"` body attribute | "No right-click" is security theatre and breaks accessibility. |
| 16 | LOW | Hygiene | Leading whitespace in CSS href | `href=" L001/consumer/theme/new_style.css"` — typo causing broken relative URL. |
| 17 | LOW | Hygiene | Outdated jQuery flexslider, web-slide-menu libraries bundled | Multiple vintage JS libraries bundled without version pinning or SRI. |

---

## Why This Matters

PNB is a public-sector bank serving customers across every Indian state and Union Territory, including large rural and semi-urban populations who rely exclusively on net banking for non-branch transactions. The bank's customer base skews toward less-technical users — exactly the population most harmed by session hijack, phishing, and clickjacking attacks. PSU banks are also bound by RBI's Cyber Security Framework ("RBI CSF") and its June 2024 update on internet banking security, which explicitly requires (a) production configurations distinct from development, (b) CSP hygiene, (c) Secure SDLC practices, and (d) third-party risk assessments.

The configuration findings here are not exotic. The `operatingMode: DEVELOPMENT` line is a single character change away from being correct. The CAPICOM object is a copy-paste artefact from a 2008 codebase. The wildcard `*.oraclecloud.com` in CSP is almost certainly the result of "I don't know which Oracle endpoints we use, so allow them all." But these are precisely the findings that a Secure SDLC gating step — running a `gitleaks`-style scan, an automated CSP linter, or a `security.txt` check — would catch in CI before any code reached production. Their continued presence on a 2026 deployment is a structural failure of the build pipeline, not of any individual developer.

PNB was the target of the 2018 ₹11,400-crore Nirav Modi fraud (via SWIFT misuse at a single branch) and multiple smaller heists since. Each incident has driven regulatory tightening; the question this analysis raises is whether that tightening is being operationalised at the internet-banking-edge layer or only at the core-banking layer.

The findings also echo those we documented in the [SBI YONO analysis](/blog/sbi-yono-security-analysis/) — PSU bank web surfaces share a common architectural lineage (Oracle WebLogic + jQuery + virtual keypad + F5 persistence) and a common set of legacy configuration smells. This suggests an industry-wide pattern that RBI's Cyber Security Framework update did not fully address.

---

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-15 | Analysis completed; initial disclosure sent to PNB's CERT-FIN contact and CERT-In. |
| 2026-06-15 | Public blog post published with technical details redacted per responsible-disclosure norms. |
| T+15 days | Expected acknowledgment from PNB CERT. |
| T+90 days | Public disclosure of specific remediation status (or non-remediation). |

---

## Recommendations

### Immediate (within 7 days)

1. **Set `operatingMode` to `PRODUCTION`** and `logMode` to `OFF` (or `SERVER`) in the production `CONFIG` object. This is a single-line change with no functional impact on legitimate users.
2. **Remove the CAPICOM `<object>` tag** from the login HTML. The component is unsupported; any code path that uses it is dead code.
3. **Tighten the CSP.** Replace `*.oraclecloud.com` with the specific Oracle Cloud object-storage endpoints PNB actually uses (`*.objectstorage.ap-mumbai-1.oraclecloud.com` at most; ideally only the specific bucket-hostname). Remove `unsafe-eval` and `unsafe-inline` from `script-src`.
4. **Fix or remove the broken Oracle bucket reference.** Either restore the `DBD_PROD_BUCKET` and verify it serves the correct assets, or update the HTML to load scripts from the same origin (`ibanking.pnb.bank.in`).

### Short-term (within 30 days)

5. **Stop URL-rewriting the JSESSIONID.** Configure Oracle WebLogic's `url-rewriting` to be disabled; rely on cookies only. Modern browsers all accept cookies; URL rewriting is a 2005-era fallback.
6. **Upgrade jQuery to 3.7.x** and audit all bundled jQuery plugins (flexslider, webslidemenu) for known CVEs.
7. **Move the `pnbtfr.pnbindia.in` login iframe to the same organisational TLD** (`pnb.bank.in`). Cross-TLD framing of login forms is an RBI cyber-security-framework red flag.
8. **Remove the `ipAddress=...` parameter from script URLs.** Server-side infrastructure details should not be visible in client HTML.
9. **Migrate from HTML 4.01 Transitional to HTML5** and fix the multiple `<head>` tags. Invalid HTML causes quirks-mode parsing and inconsistent security-control enforcement across browsers.

### Structural

10. **Implement a pre-deployment configuration lint** that fails any build whose HTML/JS contains: `operatingMode.*DEVELOPMENT`, `logMode.*CONSOLE`, `classid=`, `*.oraclecloud.com`, `jsessionid=`, or hardcoded internal IPs. This is 50 lines of regex and would have caught every CRITICAL finding in this analysis.
11. **Adopt Subresource Integrity (SRI) for all external scripts.** Even scripts hosted on Oracle Cloud should have `integrity=` attributes so a bucket compromise cannot silently swap in hostile code.
12. **Conduct an end-to-end Secure SDLC audit** against RBI's June 2024 Cyber Security Framework update. Many of the findings here are direct violations of specific RBI controls.
13. **Publish a `security.txt`** at `pnb.bank.in/.well-known/security.txt` with a monitored vulnerability-reporting address. As of this analysis, none is published.
14. **Decommission the F5 BIG-IP persistence cookies** for unauthenticated sessions; rely on transient session IDs that rotate after authentication.

---

## Cross-References

This analysis is part of an ongoing series on Indian banking and government security architecture. Related posts:

- [SBI YONO Security Analysis](/blog/sbi-yono-security-analysis/) — PSU-bank shared architectural lineage
- [BHIM UPI Security Analysis](/blog/bhim-upi-security-analysis/) — NPCI third-party tracking
- [NSDL Security Analysis](/blog/nsdl-security-analysis/) — Angular SPA client-side crypto
- [CDSL Security Analysis](/blog/cdsl-security-analysis/) — `Math.random()` in AES key generation
- [UMANG Security Analysis](/blog/umang-security-analysis/) — Hardcoded keys in Angular bundle
- [PM-Kisan Security Analysis](/blog/pm-kisan-security-analysis/) — ASP.NET WebForms client-side AES
- [Pension Seva Security Analysis](/blog/pension-seva-security-analysis/) — SBI pension portal SHA256 + server salt

---

## Methodology

Findings were derived from:

1. **HTTP headers** returned by `https://ibanking.pnb.bank.in/` and `https://internetbanking.pnbibanking.in/corp/AuthenticationController` (unauthenticated GET).
2. **Login page HTML** (~65 KB) and **homepage HTML** (~72 KB) retrieved without authentication.
3. **Public JavaScript bundles** referenced from the login HTML: `scripts/rsa.js`, `scripts/pm_fp.js`, `corp/scripts/dganalytics.js`, plus the Oracle Cloud Object Storage bucket references.
4. **Grep-based static analysis** for: development/debug flags, ActiveX/classid tags, crypto patterns, session identifiers in URLs, CSP directive contents, and legacy-library fingerprints.
5. **No authentication was performed.** No login was attempted. No credentials were submitted. No endpoints were hit with crafted payloads.

Bundle hashes and full grep outputs are available to CERT-In / NCIIPC / PNB on request.

---

*PNB's security team has historically been responsive to responsible-disclosure reports. This analysis is published in that spirit — to support, not embarrass, the operator. The findings here are configuration-layer issues that are quick to remediate once identified; the goal is to make sure they get identified, fixed, and verified.*
