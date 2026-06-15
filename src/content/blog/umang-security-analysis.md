---
title: "UMANG Portal: Security Architecture Analysis & Responsible Disclosure"
description: "Analysis of India's UMANG platform (web.umang.gov.in) reveals hardcoded API keys, MD5 salts, AES-ECB mode with localStorage keys, and a production CSP that trusts internal IPs, staging domains, and test payment gateways — affecting 71 million users of 2,000+ government services."
publishDate: 2026-06-15
draft: false
tags: ["security", "responsible-disclosure", "india-gov", "utility", "umang", "angular", "crypto"]
---

UMANG (Unified Mobile Application for New-age Governance) is India's single-platform gateway to 2,132 government services from 207 departments across 32 states, serving 7.12 crore (71.2 million) registered users. Operated by MeitY's National e-Governance Division (NeGD), it is arguably the most consequential citizen-facing digital platform in India. This analysis examines the security architecture of its web portal — both the publicly served HTTP headers *and* the client-side JavaScript bundle shipped to every browser.

This update supersedes the 2026-06-02 analysis (which covered only CSP findings) by adding **client-side code findings** from the production Angular 19.x bundles served from `web.umang.gov.in/landing/`.

---

## Responsible Disclosure Notice

This analysis is based on publicly observable HTTP headers and publicly downloadable JavaScript bundles that the portal serves to every visitor. No exploitation was performed. No authentication was bypassed. No private data was accessed. All findings are derived from artefacts the server itself returns to unauthenticated clients.

Per responsible-disclosure norms:
- **No** exact API endpoint paths are published (only category-level references).
- **No** raw hardcoded secret values are reproduced (only format/type descriptions).
- **No** step-by-step reproduction instructions are provided.
- Findings have been reported via CERT-In and NCIIPC channels.

---

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | UMANG |
| **Domain** | web.umang.gov.in |
| **Ministry** | MeitY (Ministry of Electronics & IT) |
| **Category** | Government Services Aggregator |
| **Platform** | Web (Angular 19.x SPA on AWS S3 + CloudFront + Lambda@Edge) |
| **Data Sensitivity** | **Critical** — Aadhaar, PAN, bank accounts, health records, tax data |
| **Users** | 71.2 million registered (as of March 2025) |
| **Services** | 2,132 government services |
| **Analysis Date** | 2026-06-15 (supersedes 2026-06-02) |
| **Critical Findings** | 6 |
| **High Findings** | 5 |
| **Medium Findings** | 5 |
| **Low Findings** | 2 |

---

## Summary

UMANG's web client ships production JavaScript bundles containing at least four classes of hardcoded cryptographic material — an MD5 salt used to sign API requests, a long-lived `x-api-key` for user-activity logging, a static decryption passphrase for the app's environment configuration file, and a base64-encoded bearer token used as a default request header. The same bundle uses **AES-ECB mode** with a key persisted in `localStorage`, the cryptographically weakest AES mode, to decrypt response payloads. The Content Security Policy — already analysed in our prior post — continues to trust a hardcoded BSNL-allocated IP on port 8585, multiple PayU test/staging hosts, and `stgweb.umang.gov.in` in production. Taken together, these are systemic findings that any unprivileged user (or anyone who can run JavaScript in a victim's browser via a CSP-allowed third-party host) can leverage to forge authenticated requests against the backend API.

---

## Risk Factors

- **Production CSP trusts an internal IP and test gateways.** `125.21.22.149:8585`, `test.payu.in`, `apitest.payu.in`, `acssimuat.payubiz.in`, `uat.ai.umangapp.in`, and `stgweb.umang.gov.in` all appear in `script-src`/`connect-src`/`frame-src`. Any compromise of these origins becomes a code-execution vector inside the UMANG tab.
- **Static MD5 salt for the `x-requestvalue` anti-tamper header.** The MD5 is computed as `CryptoJS.MD5(payload + "|" + SALT)`. The salt is embedded in plain text inside the production bundle, so the header provides zero protection — anyone can compute valid values. MD5 is also cryptographically broken for collision resistance.
- **AES-ECB decryption of API responses.** Responses from at least one UMANG API surface are decrypted using `CryptoJS.AES.decrypt(..., {mode: CryptoJS.mode.ECB})` with a key persisted in `localStorage.tempKey`. ECB leaks plaintext patterns, and `localStorage` is fully readable by any XSS payload.
- **Long-lived `x-api-key` baked into the bundle.** A ~40-character alphanumeric API key is hardcoded as the authentication credential for the activity-logging endpoint — there is no per-user, per-session, or rotating credential.
- **Plaintext token in base64 inside `common_apis.min.js`.** A default request header is populated from `window.atob("eyJ0b2tlbiI6...")`, which decodes to a JSON object containing a token and department identifier. Base64 is encoding, not encryption.
- **Test/staging credentials and hosts are visible to every visitor.** This is consistent with a deployment pipeline that promotes the same build artefact across dev → staging → prod without redaction.
- **Third-party analytics, chatbots, and AI vendors whitelisted in CSP.** Multiple foreign-origin scripts (Google, Amrita, Bhashini, aware.senseforth.com, MapMyIndia, PowerBI) can execute inside the portal context.
- **Angular SPA loads environment configuration at runtime and decrypts it with a hardcoded key.** The pattern `en(envConfig, "JFwj...")` decrypts the remote config — meaning the entire env file (which likely holds further secrets) is decryptable by anyone who downloads the bundle.

---

## Impact Scenarios

### Scenario A — Session hijack via XSS in a CSP-trusted third party

Suppose one of the many third-party hosts whitelisted in the production CSP (a CDN, an AI chat widget, or a vendor like the analytics tracker) is compromised, or has a permissive upload endpoint. Because the CSP lists that host in `script-src`, the browser will execute attacker-supplied JavaScript in the context of the logged-in UMANG tab. That script can then read `localStorage.tempKey` (used for AES decryption), read `sessionStorage` JWTs, and forge `x-requestvalue` headers using the bundled MD5 salt — effectively elevating from "ran some JS" to "made authenticated API calls on the user's behalf."

### Scenario B — Mass scraping of department catalogues and service metadata

Because the `x-api-key` for the activity-logging API is hardcoded in the bundle and never rotates, a hostile client can use it indefinitely without ever authenticating. Combined with the predictable API path structure (visible in the bundle as `/api/vX/.../...` style routes), an attacker can enumerate services, departments, and scheme availability at scale without detection.

### Scenario C — Decryption and tampering of API responses

The AES-ECB decryption pattern means anyone observing a response (e.g., via a TLS-terminating proxy on a hostile network, or via compromised upstream infrastructure) can mount a block-substitution attack. ECB encrypts each 16-byte block independently — an attacker who knows the plaintext format can splice blocks from one response into another to alter returned data (e.g., a payment confirmation, a service status).

### Scenario D — SIM-swap + Aadhaar-linked abuse

UMANG integrates with DigiLocker for Aadhaar verification (visible in the bundle as `[k.digilocker]:"digilockerBearerToken"` and an `Authorization: digilockerBearerToken` header). If a user's session is hijacked through any of the above vectors, the attacker can proxy authenticated DigiLocker requests through UMANG's backend — bypassing DigiLocker's own device-binding controls and exposing Aadhaar data. See our [Aadhaar/UIDAI analysis](/blog/aadhaar-uidai-security-analysis/) for prior context on UIDAI's exposed service subdomains.

---

## Findings Overview

| # | Severity | Layer | Category | Finding |
|---|----------|-------|----------|---------|
| 1 | CRITICAL | Client JS | Hardcoded MD5 salt for request signing | `CryptoJS.MD5(payload + "|" + SALT)` where SALT is a hardcoded string in the production bundle. Used to compute the `x-requestvalue` anti-tamper header. |
| 2 | CRITICAL | Client JS | Hardcoded `x-api-key` for activity logging | ~40-character alphanumeric string set as the `x-api-key` header on every "service visit" log POST, with no rotation. |
| 3 | CRITICAL | Client JS | Hardcoded env-decryption key | The remote `env` config object is decrypted client-side using a ~12-character static key string. |
| 4 | CRITICAL | Client JS | Base64-encoded bearer token in `common_apis.min.js` | `window.atob("eyJ0b2tlbiI6...")` decodes to a JSON with a token and department identifier — used as a default request header. |
| 5 | CRITICAL | Client JS | AES-ECB mode for response decryption | `CryptoJS.AES.decrypt(..., {mode: CryptoJS.mode.ECB})` with key pulled from `localStorage.tempKey`. ECB leaks plaintext patterns; `localStorage` is XSS-readable. |
| 6 | CRITICAL | HTTP headers | Internal IP in production CSP | `125.21.22.149:8585` (BSNL IP) trusted across `script-src`, `connect-src`, `frame-src`, `style-src`, `font-src`, `img-src`, `media-src`. |
| 7 | HIGH | HTTP headers | Test payment gateways in production CSP | `test.payu.in`, `apitest.payu.in`, `acssimuat.payubiz.in` whitelisted for scripts, frames, styles, connections in production. |
| 8 | HIGH | HTTP headers | Staging/UAT domains in production CSP | `uat.ai.umangapp.in`, `stgweb.umang.gov.in`, `apitest.payu.in` whitelisted in production. |
| 9 | HIGH | Client JS | Base64 used as "encryption" for payloads | `body: JSON.stringify({payload: window.btoa(JSON.stringify(...))})` — encoding mistaken for encryption on multiple POST paths. |
| 10 | HIGH | Client JS | Third-party AI/chatbot credentials in client bundle | Bhashini `bhashniCreds.atk`, `bhashniCreds.ulAK`, `bhashniCreds.userId`, `bhashniCreds.pipelineId` all stored client-side and attached as headers (`Authorization`, `ulcaApiKey`, `userID`). |
| 11 | HIGH | HTTP headers | `unsafe-inline` + `unsafe-eval` in CSP script-src | Both keyword permits present — combined with the long list of trusted third-party hosts, this collapses the CSP's XSS protection. |
| 12 | MEDIUM | Privacy | Google Analytics + DoubleClick tracking on citizen portal | `UA-87973874-4`, `G-CASESTUDY`, `G-LANDING`, and `stats.g.doubleclick.net` whitelisted; page views and citizen journeys exposed to ad-tech. |
| 13 | MEDIUM | Privacy | PowerBI dashboards in `frame-src` | `app.powerbi.com` whitelisted for framing — operational metrics (and potentially citizen data) flow to Microsoft infrastructure. |
| 14 | MEDIUM | Supply chain | External CDN scripts without SRI | `code.jquery.com`, `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`, `ajax.googleapis.com` whitelisted; no `integrity` attributes observed. |
| 15 | MEDIUM | Architecture | Multiple AWS S3 buckets whitelisted | `s3-umangconvai-prod-chatbot.s3.ap-south-1.amazonaws.com`, `aware-commons.s3.ap-south-1.amazonaws.com`, `jsbin-user-assets.s3.amazonaws.com` (in `font-src`) — broad third-party-hosting trust surface. |
| 16 | MEDIUM | Architecture | Third-party AI/chatbot infrastructure | `ai.umangapp.in`, `chatbot.umangapp.in`, `islchat-amrita-create-ai{1,2}.web.app`, `aware.senseforth.com`, `dhruva-api.bhashini.gov.in`, `meity-auth.ulcacontrib.org` — six+ external AI dependencies in the request path. |
| 17 | LOW | Hygiene | Duplicated CSP entries | Multiple hosts repeated 3-5 times within a single directive (e.g., `islchat-amrita-create-ai2.web.app` appears 4× in `script-src`) — indicates manual editing rather than generated config. |
| 18 | LOW | Hygiene | Mixed HTTP/HTTPS reference in bundle | `http://morth.nic.in/` referenced from a lazy-loaded chunk; rest of the portal is HTTPS-only. |

---

## Why This Matters

UMANG is not a single application — it is a **federation layer** over 2,132 services. A security failure at the federation layer is amplified across every downstream service: Aadhaar linking, PAN verification, EPF access, state utility bills, passport status, COVID vaccination records, pension disbursement, and dozens more. The same `apigw.umang.gov.in` backend that proxies citizen requests also carries the bearer tokens, OTP challenges, and PII payloads of all 71 million users.

The client-side crypto findings are particularly serious because they convert "I can read the bundle" into "I can forge your auth headers" with no server-side check in the way. The MD5 salt is shipped to every browser. The `x-api-key` is shipped to every browser. The env decryption key is shipped to every browser. There is no secret that is actually secret.

This pattern — secrets baked into a JavaScript bundle — is the same architectural error we documented in the [NSDL](/blog/nsdl-security-analysis/) and [CDSL](/blog/cdsl-security-analysis/) analyses, and it reflects a broader misunderstanding in Indian government fintech that "if the user can't see it, it's hidden." Browsers show everything they execute.

The CSP issues, which we previously reported on 2026-06-02, have **not been remediated** as of the 2026-06-15 re-scan. The internal IP, PayU test hosts, and staging domains all remain in the production CSP. This suggests that either no remediation work has been done, or that the CSP is generated by code that has never been audited end-to-end.

---

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-02 | Initial CSP analysis published (CSP-layer findings only). |
| 2026-06-02 | CERT-In and NCIIPC notified of CSP-layer findings (ref: internal). |
| 2026-06-15 | Re-scan: CSP findings unchanged; client-side JavaScript bundle analysed; six CRITICAL client-side findings added. |
| 2026-06-15 | Updated disclosure sent to CERT-In with client-side findings, including bundle hashes for traceability. |
| T+90 days | Public disclosure of specific remediation status (or non-remediation). |

---

## Recommendations

### Immediate (within 7 days)

1. **Move the MD5 salt off the client.** The `x-requestvalue` header should be replaced with a server-issued, short-lived HMAC token. If client-side request signing is truly required, use HMAC-SHA256 with a per-session key derived from the user's auth token — never a static salt.
2. **Rotate the hardcoded `x-api-key`** and replace it with a server-mediated session token. Long-lived static API keys must not appear in any client bundle.
3. **Rotate the env decryption key** (`JFwj...`) and switch to server-side environment configuration. The client should never have to decrypt secrets — it should receive non-secret configuration only.
4. **Remove `125.21.22.149:8585` from the production CSP** immediately and investigate why a BSNL-allocated IP was ever trusted for script execution on a citizen portal.
5. **Remove all PayU test/staging hosts** (`test.payu.in`, `apitest.payu.in`, `acssimuat.payubiz.in`) from the production CSP and from any production build artefact.

### Short-term (within 30 days)

6. **Replace AES-ECB with AES-GCM** for response decryption. ECB is forbidden in modern crypto standards (NIST SP 800-38A explicitly warns against it).
7. **Move the AES key out of `localStorage`.** Use a server-issued, HttpOnly, Secure, SameSite=Strict cookie for session-bound keys; never store symmetric keys in client-readable storage.
8. **Stop using `btoa()` as encryption.** Base64 is an encoding. Any "encrypted" payload that is actually base64 is plaintext.
9. **Audit every third-party host in the CSP.** Each entry must be justified, must support HTTPS, and must have a documented business owner. Remove `jsbin-user-assets.s3.amazonaws.com` and any other developer-convenience hosts.
10. **Add Subresource Integrity (SRI) to all external scripts** loaded from CDNs (`code.jquery.com`, `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`, `ajax.googleapis.com`).

### Structural

11. **Adopt a "secrets-as-code" pipeline check** that fails any build whose bundle contains strings matching common secret patterns (long base64, UUIDs, `AIza...`, `x-api-key:`, `Authorization:`). Open-source tools like `gitleaks`, `trufflehog`, or `secretlint` can gate CI.
12. **Generate the CSP from a single source of truth** (e.g., a YAML config) so that development hosts cannot leak into production by accident.
13. **Publish a security.txt** at `web.umang.gov.in/.well-known/security.txt` with a clearly monitored vulnerability-reporting address. As of this analysis, none is published.
14. **Conduct an independent third-party security audit** of the entire UMANG web client build pipeline, given that multiple classes of finding (CSP, secrets, crypto) all point to the same root cause: no gating step between "developer merged code" and "code shipped to 71 million users."
15. **Re-evaluate the third-party analytics stack.** Google Analytics and DoubleClick tracking on a citizen portal that proxies Aadhaar, PAN, and bank-account verification raises both privacy and regulatory concerns under the DPDP Act, 2023.

---

## Cross-References

This analysis is part of an ongoing series on Indian government / DPI security architecture. Related posts:

- [Aadhaar (UIDAI) Security Analysis](/blog/aadhaar-uidai-security-analysis/) — UIDAI service subdomains and historical breach context
- [BHIM UPI Security Analysis](/blog/bhim-upi-security-analysis/) — NPCI's systemic third-party tracking problem
- [DigiLocker Security Analysis](/blog/digilocker-security-analysis/) — DigiLocker token handling (relevant to UMANG's DigiLocker integration)
- [NSDL Security Analysis](/blog/nsdl-security-analysis/) — Same "Angular bundle with hardcoded keys" pattern
- [CDSL Security Analysis](/blog/cdsl-security-analysis/) — `Math.random()` in AES key generation
- [PM-Kisan Security Analysis](/blog/pm-kisan-security-analysis/) — Client-side AES with hidden-field keys
- [Co-WIN Portal Security Analysis](/blog/cowin-security-analysis/) — Angular SPA auth-interceptor anti-pattern
- [MyGov Security Analysis](/blog/mygov-security-analysis/) — Well-maintained Drupal comparison baseline

---

## Methodology

Findings were derived from:

1. **HTTP headers** returned by `https://web.umang.gov.in/` (unauthenticated `GET`).
2. **Production JavaScript bundles** publicly served from `https://web.umang.gov.in/landing/`:
   - `main-4GECWPRZ.js` (Angular main bundle, ~695 KB)
   - `polyfills-B6TNHZQ6.js`
   - `scripts-H6RMIGGK.js` (includes bundled CryptoJS)
   - `chunk-*.js` (lazy-loaded route bundles)
   - `common_apis.min.js`, `service_auth.min.js`, `chat-umang.js` (UMANG-specific helpers)
3. **Grep-based static analysis** for: hardcoded secrets, crypto patterns (`CryptoJS.*`, `btoa`, `atob`), UUID-format strings, API base URLs, PII field names, auth-token patterns, and tracking IDs.
4. **No authentication was performed.** No endpoints were hit with crafted payloads. No user data was accessed.

Bundle hashes and full grep outputs are available to CERT-In / NCIIPC on request.

---

*This analysis is published under responsible-disclosure norms. The goal is not to embarrass the operator — NeGD and MeitY do difficult, high-stakes work — but to make the case that the build pipeline, not the application code, is where systemic fix leverage exists. UMANG is too important to Indian digital governance to leave these issues unaddressed.*
