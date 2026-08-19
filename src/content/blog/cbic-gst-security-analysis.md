---
title: "CBIC GST Portal: Security Architecture Analysis & Responsible Disclosure"
description: "Static analysis of the CBIC GST / ACES taxpayer portal's public JavaScript bundles reveals a hardcoded AES passkey, PBKDF2 at 100 iterations, TRN identifiers in GET query strings, and commented-out UAT payment URLs — on a Ministry of Finance production system."
publishDate: 2026-08-19
draft: false
---

The Central Board of Indirect Taxes and Customs (CBIC) runs the taxpayer-facing front-end for Central Excise, Service Tax, and the new HSNS cess through its online portal. Behind the informational website sits an Angular application — the portal UI — that handles registration, filing declarations, OTP-based login, and payment redirection for lakhs of registered taxpayers.

I performed a static security analysis of the publicly served JavaScript bundles of this portal. The findings below are derived entirely from code that any visitor's browser downloads on every page load. No authentication was bypassed, no data was accessed, and no active exploitation was performed.

---

## Scope of Analysis

- **Informational site**: the main CBIC GST web presence (`cbic-gst.gov.in` style domain)
- **Taxpayer portal UI**: the Angular SPA reachable from the site's login links (path pattern `/portal-ui/*` in this write-up)
- **Tax information microsite**: an Angular portal on a related subdomain

Analysis was limited to publicly downloadable client-side code: HTML, headers, and JavaScript bundles. Endpoint paths below are partially redacted to prevent trivial reproduction.

---

## Findings

### Finding 1: Hardcoded AES Passkey in the Public JavaScript Bundle

**Severity: Critical**

The portal's `main` JavaScript bundle contains an `EncryptionService` used to "encrypt" taxpayer passwords before transmission. The service embeds its key material directly in the shipped code:

```
var passkey = "<redacted base64 key material>";
```

The scheme is CryptoJS AES-CBC with a PBKDF2-derived key. Anyone can download the bundle — it is served to every visitor — and extract the passkey in seconds. Because the passphrase never changes server-side-visible to the client, this "encryption" is **obfuscation, not confidentiality**: an attacker who captures an "encrypted" password blob (from logs, a proxy, or a compromised intermediary) can derive the same AES key and decrypt it offline.

This pattern is endemic in Indian government web apps. The same class of issue appeared in the [U-WIN immunization portal](/blog/uwin-security-analysis/) analysis.

**Fix**: Client-side password "encryption" is security theatre. Send credentials over TLS to a properly rate-limited, CAPTCHA-protected endpoint and hash server-side (argon2id/bcrypt). If envelope encryption is genuinely required, use per-session public-key encryption (hybrid encryption with an ephemeral key) so the client never holds shared secret material.

### Finding 2: PBKDF2 With 100 Iterations

**Severity: High**

The same `EncryptionService` derives its AES key via PBKDF2 with `iterations: 100`. OWASP recommends a minimum of 600,000 iterations for PBKDF2-HMAC-SHA256 (310,000 for SHA1). One hundred iterations offers essentially no work factor — the key derivation is nearly free for an attacker with a GPU.

Combined with Finding 1, the entire client-side crypto stack collapses to: extract static passkey → run cheap KDF → decrypt any captured blob.

**Fix**: If a KDF is used at all, use modern parameters. Better, remove client-side crypto entirely (see Finding 1).

### Finding 3: Taxpayer Reference Numbers in GET Query Strings

**Severity: High**

Multiple service calls pass the taxpayer's Temporary Reference Number (TRN) and registration numbers as URL query parameters on GET requests:

```
this.http.get('/portal-web/auth*?trn=' + trn)
```

GET parameters are logged by default in: webserver access logs, intermediary proxies, the browser's URL history, and any operational monitoring. A TRN leaking via a shared/leaked log is enough for an attacker to enumerate another taxpayer's application status and associated details (the response includes ARN and application status fields). A related endpoint also accepts a `registrationNo=` parameter in cleartext GET.

**Fix**: Move identifiers into POST bodies or headers, ensure responses are scoped by server-side session authorization (never trust a client-supplied identifier alone), and scrub identifiers from logs.

### Finding 4: OTP State Held in sessionStorage, Wide API Surface

**Severity: Medium**

The bundle shows OTP pending-verification state stored in `sessionStorage` (`*_PENDING_LOGIN_OTP` keys) and a large surface of OTP endpoints: generate, validate, resend, and password-reset OTP flows, plus a legacy in-browser captcha loader. Any XSS — and the site's CSP allows `unsafe-inline` and `unsafe-eval` scripts (see Finding 6) — can read OTP state, hijack the pending session, and drive the resend/validate flows. There is no visible reCAPTCHA/enterprise bot-protection wiring in the bundle.

**Fix**: Keep OTP state server-side, keyed to the server session. Add CAPTCHA/bot protection on OTP generation and password-reset endpoints, with per-identity and per-IP rate limits and resend ceilings.

### Finding 5: Commented-Out UAT and Payment URLs in Production Code

**Severity: Medium (Information Disclosure)**

The production bundle contains commented-out code pointing to a **UAT payment gateway** host and the production ICEGATE payment host, alongside commented parameter objects showing the field names (`ceStRegistationNo`, etc.) sent to the payment system. Dead code in shipped bundles is free reconnaissance for attackers: internal hostnames, environment topology, and parameter schemas without touching the target.

**Fix**: Strip dead code and internal hostnames in production builds (`terser` drop_console + dead-code elimination, or build-time environment gating). Never ship UAT/staging identifiers in production bundles.

### Finding 6: CSP Effectively Disabled + Incomplete TLS Chain on a Related Subdomain

**Severity: High**

The main site's Content-Security-Policy includes `unsafe-inline` and `unsafe-eval` in `script-src`. Per this project's established methodology, a CSP with both directives is functionally equivalent to no CSP — it provides zero protection against script injection. Additionally, the tax-information subdomain serves an **incomplete TLS certificate chain** (client verification fails with "unable to verify the first certificate"), which breaks strict clients and invites downgrade-interception tooling on networks with poor rooting.

**Fix**: Adopt a nonce-based CSP without `unsafe-*` script directives (Angular supports this natively). Fix the intermediate certificate chain on all subdomains.

### Finding 7: Third-arty CDN Dependencies Without SRI

**Severity: Medium**

The informational site loads jQuery plugins and HTML5 shims from `cdnjs.cloudflare.com` and `oss.maxcdn.com` script tags with no `integrity` (SRI) attributes, and loads Google CSE with a hardcoded engine ID. A compromised CDN (or a DNS-level interception) becomes code-execution on a Ministry of Finance domain. The site also ships IE8-era responsive shims — indicating a very old dependency baseline with known CVEs in transit.

**Fix**: Self-host static assets on the origin, pin versions, add SRI where CDNs remain, and remove decade-old shims.

---

## Impact Scenario (Hypothetical)

A taxpayer visits the portal to file a cess declaration. Their browser downloads the main bundle containing the static passkey. An attacker with access to any intermediary log capturing the "encrypted" password blob decrypts it offline using the bundle's own key and 100-iteration KDF. Separately, a leaked access-log line containing a `trn=` query value lets the attacker query application status for arbitrary taxpayers, revealing ARN numbers and filing state. All of this requires no vulnerability "exploit" in the classic sense — only the portal's own shipped code and default logging behaviour.

## Recommendations Summary

1. **Remove all cryptographic secrets from client bundles.** Rotate the exposed passkey immediately, then redesign the credential path.
2. **Server-side authorization on every identifier-taking endpoint.** A TRN/registration number in a request must never be sufficient to fetch the corresponding record.
3. **Rate-limit and CAPTCHA-gate all OTP endpoints**, and move OTP state out of the browser.
4. **Adopt a nonce-based CSP** and fix the TLS chain on all subdomains.
5. **Strip dead code and internal hostnames from production builds.**
6. **Self-host or SRI-protect third-party scripts.**

## Disclosure

This analysis used only publicly accessible client-side code, served to every visitor. Endpoint paths and the key value are redacted here to prevent trivial reproduction. CBIC/ICEGATE operate responsible channels; findings will be reported via CERT-In's vulnerability reporting format. This is the latest in a series — see the [U-WIN analysis](/blog/uwin-security-analysis/) and the [full series index](/blog/).

*Analysis date: 2026-08-19. Methodology: static analysis of public JavaScript bundles, HTTP headers, and TLS configuration.*
