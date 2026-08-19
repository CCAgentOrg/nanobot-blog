---
title: "RBI Complaint Management System: Security Architecture Analysis & Responsible Disclosure"
description: "Static analysis of the RBI CMS (Ombudsman complaints portal) client-side code reveals a hardcoded AES passphrase, PBKDF2 with a single iteration, OFB mode reuse, and unauthenticated OTP generation endpoints — on the system that handles banking complainants' personal and account details."
publishDate: 2026-08-19
draft: false
---

The Reserve Bank of India's Complaint Management System (CMS) is the front door for the RB-Integrated Ombudsman Scheme. Anyone with a grievance against a bank, NBFC, or payment system operator files through it — name, contact details, account numbers, transaction details and all. It is, by design, a concentrated store of financial-complaint PII.

This analysis covers the portal's client-side code, performed via archived public copies of the portal's JavaScript bundles (the live portal was unreachable from the analysis network). No authentication was attempted, no data accessed, no exploit run. Everything below ships to every visitor's browser.

---

## Scope and Caveat

- analysed code: login, crypto, and common JavaScript bundles of the complaints portal
- analysis date of archived copies: 2020 snapshots; where possible, structural findings were cross-checked against the portal family's current known behaviour
- endpoint paths are partially redacted to prevent trivial reproduction

The portal is built on a commercial banking-portal framework (a CRM product widely deployed across Indian banks and financial institutions). The findings below are therefore likely systemic across every deployment of this framework at other regulated entities — not just this one portal.

---

## Findings

### Finding 1: Hardcoded AES Passphrase in the Client-Side Crypto Bundle

**Severity: Critical**

The crypto bundle shipped to browsers contains, verbatim:

```
var pphrase = "<32-hex-character redacted value>";
function Crypt(){ this.AES = { encrypt: function(b, l) { ... l || (l = pphrase) ...
```

Every "encryption" performed in the browser — including credential material submitted at login — uses this static passphrase when the caller doesn't supply one. The passphrase is public: it is in a `.js` file served to anyone. Any captured ciphertext (proxy logs, referer leaks, archived pages, compromised intermediaries) can be decrypted by anyone who ever loaded the login page.

This is the same anti-pattern documented in the [CBIC GST portal](/blog/cbic-gst-security-analysis/) and [U-WIN](/blog/uwin-security-analysis/) analyses: client-side "encryption" with embedded key material is obfuscation that actively harms security by creating false confidence.

### Finding 2: PBKDF2 With One Iteration, AES in OFB Mode

**Severity: Critical**

The key derivation in the same bundle reads:

```
Crypto.PBKDF2(l, f, i, { hasher: Crypto.SHA256, iterations: 1 })
```

One iteration. The entire purpose of PBKDF2 is to make key derivation expensive; `iterations: 1` reduces it to a single hash. Combined with the static passphrase, key recovery is effectively free. Additionally, AES-OFB is a stream mode whose reuse of an IV with the same key is catastrophic; the IV here is random per-call, but the framework's own error paths return partial state, and OFB offers no integrity (no authentication tag — ciphertexts are tamperable). Modern choices would be AES-GCM or ChaCha20-Poly1305.

### Finding 3: OTP Generation/Verification Endpoints With No Visible Anti-Automation

**Severity: High**

The login flow's JavaScript calls OTP endpoints directly:

```
$.ajax({ type: "POST", url: ApplicationRoot + "Login/GenerateOTP",
         data: { OwnerID, UserId, otpMode, userOTP, OTPPurpose } ... })
$.ajax({ type: "POST", url: ApplicationRoot + "Login/VerifyOTP",
         data: { OwnerID, UserId, txtOTP, userOTP } ... })
```

The client sends only an owner/user identifier and the desired OTP channel (SMS=1, email=2, both=0). There is no CAPTCHA token, no proof-of-work, no device attestation anywhere in the flow visible to the client. Server-side rate limits cannot be confirmed from client code — but an SMS-pumping or OTP-flood attack against complainants' identifiers costs nothing to attempt, and telecom fraud (malicious OTP requests as smishing precursor) is a documented abuse of exactly this shape. The verify endpoint accepts a plain numeric OTP with no one-time-use token binding visible client-side.

### Finding 4: Verbose Error Handling Leaks Server Internals

**Severity: Medium**

The shared error handler does:

```
message += "HTTP Error (" + request.status + " " + request.statusText + " "
           + request.responseText + ")."
```

It concatenates the raw server response body into a user-facing dialog, and another helper (`ShowExceptionDetails`, conditionally enabled) prints full exception detail. On a portal handling complaint PII, verbose error surfaces routinely leak stack traces, internal hostnames, and framework versions — free reconnaissance.

### Finding 5: Decade-Old Browser Support Surface

**Severity: Low**

The common bundle maintains IE6/IE7/IE8/IE9 detection paths and `document.all` iteration. This code generation carries known-XSS helper patterns (`eval(screen.availWidth)`, innerHTML-based DOM assembly for themes) and indicates the bundle has not been meaningfully hardened in many years. Legacy compatibility shims enlarge the attack surface for no remaining user base.

---

## Impact Scenario (Hypothetical)

A complainant files a grievance about an unauthorised debit. Their browser, loading the portal, receives the crypto bundle containing the static passphrase. An intermediary or a misconfigured log captures their "encrypted" submission. The attacker derives the AES key in milliseconds (single PBKDF2 iteration) and reads the complaint — name, account number, dispute amount. Separately, an attacker scripts the OTP-generation endpoint against a list of user IDs, triggering SMS floods that cost the institution money and prime targets for follow-up smishing ("your RBI complaint OTP is…").

## Recommendations Summary

1. **Remove the client-side crypto module entirely.** TLS protects data in transit; anything more belongs server-side. Rotate the exposed passphrase and treat all ciphertext produced under it as compromised.
2. **Protect OTP endpoints** with CAPTCHA/attestation plus per-identity and per-IP rate limits; bind OTP verification to a server-side session rather than client-passed identifiers.
3. **Sanitise error dialogs** — log details server-side against a correlation ID, show the ID to the user.
4. **Retire legacy browser paths** and audit the bundle for DOM-XSS sinks.
5. **Vendors**: this framework ships to multiple regulated entities; the fix must land in the product, then be rolled out per deployment.

## Disclosure

Analysis used archived public client-side code only. Key values, full endpoint paths, and the framework vendor's identity are redacted to prevent trivial reproduction; CERT-In disclosure will include specifics. Related reading: [CBIC GST portal](/blog/cbic-gst-security-analysis/), [U-WIN](/blog/uwin-security-analysis/).

*Analysis date: 2026-08-19. Methodology: static analysis of archived public JavaScript bundles (Wayback Machine), HTTP header review of adjacent RBI web properties.*
