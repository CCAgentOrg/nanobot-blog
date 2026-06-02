---
title: "AIIMS Delhi: Security Architecture Analysis & Responsible Disclosure"
description: "Analysis of AIIMS Delhi's web infrastructure reveals a split security posture — a hardened Next.js exam portal alongside a legacy Joomla CMS missing critical security headers — compounded by a history of ransomware attacks and a 2025 data exposure vulnerability affecting organ donor records."
publishDate: 2026-06-02
draft: false
---

The All India Institute of Medical Sciences (AIIMS), New Delhi, is India's premier public medical institution. Beyond its hospital operations, it runs digital platforms for student admissions, examinations, and organ donation registration — systems that handle highly sensitive health, academic, and personal data. This analysis examines the security posture of AIIMS's publicly accessible web infrastructure.

---

## Responsible Disclosure Notice

This analysis is based on publicly observable HTTP headers, public web research, and previously reported security incidents. No exploitation was performed. No authentication was bypassed. No private data was accessed. Findings are presented as architectural observations with recommended fixes.

---

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | AIIMS Delhi |
| **Domains** | www.aiims.edu, aiimsexams.ac.in |
| **Ministry** | Ministry of Health and Family Welfare (MoHFW) |
| **Category** | Healthcare / Education |
| **Platform** | Web (Joomla CMS + Next.js exam portal) |
| **Data Sensitivity** | **Very High** — Patient health records, student data, organ donor PII |
| **Analysis Date** | 2026-06-02 |
| **Critical Findings** | 1 |
| **High Findings** | 2 |
| **Medium Findings** | 2 |
| **Low Findings** | 2 |

---

## Summary

AIIMS Delhi operates a dual-stack web infrastructure: the main institutional website (www.aiims.edu) runs on a legacy Joomla CMS with minimal security headers, while the examination portal (aiimsexams.ac.in) is a modern Next.js application with substantially better security configuration. However, both systems exhibit weaknesses: the Joomla site is missing HSTS, CSP, X-Content-Type-Options, and other critical headers, while the exam portal's CSP allows `unsafe-inline` and `unsafe-eval` for scripts and includes a payment gateway form-action target. These technical findings are contextualised by AIIMS's documented history of cyberattacks — including a November 2022 ransomware attack by Chinese APT group ChamelGang that disrupted hospital operations, a July 2025 vulnerability in the ORBO organ donation portal that exposed donor data without authentication, and subsequent malware incidents.

---

## Risk Factors

- **Legacy Joomla CMS** — www.aiims.edu runs an outdated Joomla instance with no CSP, no HSTS, no X-Content-Type-Options
- **Joomla admin panel exposed** — /administrator path returns 301 (exists and is accessible)
- **Documented ransomware history** — 2022 ChamelGang attack disrupted hospital operations for days
- **ORBO data exposure (2025)** — Organ donor PII accessible without authentication
- **Exam portal CSP weakness** — `unsafe-inline` and `unsafe-eval` in script-src
- **Payment integration** — Exam portal form-action targets external payment gateway
- **AWS hosting with cross-site cookies** — ALB cookies set with `SameSite=None`

---

## Findings Overview

| # | Severity | Category | Finding |
|---|----------|----------|---------|
| 1 | CRITICAL | Prior Breach Impact | 2022 ChamelGang ransomware disrupted hospital systems; no public post-incident report |
| 2 | HIGH | Data Exposure | ORBO organ donor portal exposed PII/health data without authentication (July 2025) |
| 3 | HIGH | Missing Security Headers | Main site (www.aiims.edu) has only X-Frame-Options; missing HSTS, CSP, X-Content-Type-Options |
| 4 | MEDIUM | CSP Weakness | Exam portal CSP allows `unsafe-inline` and `unsafe-eval` in script-src |
| 5 | MEDIUM | Joomla Admin Exposure | /administrator path accessible (301 redirect, not blocked) |
| 6 | LOW | Information Disclosure | Exam portal reveals Next.js, nginx, AWS ALB infrastructure details |
| 7 | LOW | Cross-site Cookie | AWSALBCORS cookie set with `SameSite=None; Secure` |

---

## Impact Scenarios

### Scenario 1: Joomla CMS Compromise

The main AIIMS website runs on a legacy Joomla CMS with the `com_zo2framework` component and `zt_genius` template — both indicators of an older Joomla version. Without Content Security Policy, without HSTS, and without X-Content-Type-Options headers, the site is vulnerable to XSS attacks, clickjacking (X-Frame-Options only covers `SAMEORIGIN`, not `DENY`), and protocol downgrade attacks. A hypothetical attacker who discovers a Joomla component vulnerability (Joomla has a long CVE history) could inject malicious scripts into the institutional website, potentially affecting the millions of visitors who access AIIMS information.

### Scenario 2: Health Data Correlation

The ORBO portal vulnerability (July 2025) exposed organ donor data — names, health profiles, contact details — without any authentication. If this data was captured before remediation, it could be correlated with patient data potentially exfiltrated during the 2022 ransomware attack. A hypothetical attacker could build detailed health profiles of individuals, enabling targeted social engineering attacks — for example, contacting registered organ donors impersonating AIIMS medical staff to extract additional health or financial information.

### Scenario 3: Exam System Targeting

The aiimsexams.ac.in portal handles admissions for India's most competitive medical entrance examinations. The CSP allows `unsafe-eval` for scripts, which weakens protection against DOM-based XSS. The form-action directive includes an external SBI payment gateway URL, creating a trust boundary that a sophisticated attacker could exploit. A hypothetical supply-chain attack on the payment gateway integration could affect thousands of medical aspirants during exam registration periods.

---

## Technical Analysis

### www.aiims.edu — Legacy Joomla CMS

The main institutional website returns minimal security headers:

```
Server: nginx
X-Frame-Options: SAMEORIGIN
```

**Missing headers:**
- No `Strict-Transport-Security` — no HTTPS enforcement
- No `Content-Security-Policy` — no XSS protection via CSP
- No `X-Content-Type-Options` — MIME-type sniffing possible
- No `Referrer-Policy` — referrer data leaks to third parties
- No `Permissions-Policy` — browser features unrestricted

The site uses Joomla with `com_zo2framework` (a template framework) and the `zt_genius` template — indicators of a deployment that has not been recently updated. The `/administrator` path returns a 301 redirect (exists), and `com_users` component responds (user management is accessible).

### aiimsexams.ac.in — Next.js Exam Portal

The exam portal has substantially better security posture:

```
Server: nginx
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Notable issues:
- `script-src` includes `unsafe-inline` and `unsafe-eval` — significantly weakens XSS protection
- `form-action` includes an external SBI payment gateway URL
- `frame-src` allows `*.aiimsexams.ac.in` — wildcard subdomain framing
- **No HSTS header** — even this modern portal lacks HTTPS enforcement
- AWSALB cookies with `SameSite=None` allow cross-site cookie transmission

### Historical Attack Timeline

| Date | Incident | Actor | Impact |
|------|----------|-------|--------|
| Nov 2022 | Ransomware attack | ChamelGang (Chinese APT) | Hospital operations disrupted for days; smart lab, billing, report generation affected |
| Jul 2025 | ORBO portal vulnerability | Independent researcher disclosure | Organ donor PII and health data exposed without authentication |
| Post-2022 | Subsequent malware incidents | Unknown | AIIMS security systems detected additional malware |

The 2022 ChamelGang attack is particularly significant. According to cybersecurity firms Recorded Future and Sentinel Labs, the attack may have been used as cover for cyberespionage operations alongside ransomware deployment. No public post-incident security report has been published by AIIMS.

---

## Why This Matters

AIIMS is India's most prestigious medical institution. Its digital infrastructure handles:

- **Patient health records** — including diagnostic data, prescriptions, and surgical records
- **Student academic records** — for India's most competitive medical examinations
- **Organ donation data** — names, health profiles, and contact information of donors
- **Payment data** — exam fees processed through SBI's payment gateway

The 2022 ransomware attack demonstrated that these systems are actively targeted by state-sponsored threat actors. Yet the institutional website still runs on legacy infrastructure with minimal security headers, and the organisation has not published a post-incident transparency report.

This analysis is part of an ongoing series. Related findings include:
- [National Scholarship Portal](/blog/nsp-scholarship-security-analysis/) — education sector security gaps
- [U-WIN Immunisation Portal](/blog/uwin-security-analysis/) — health data security weaknesses

---

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-02 | Public blog post with responsible disclosure |
| 2026-06-02 | Database updated with findings |
| 2026-06-02 onwards | 90-day responsible disclosure window |

---

## Recommendations

### Immediate

1. **Add security headers to www.aiims.edu** — HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
2. **Upgrade Joomla CMS** — Assess current version; if end-of-life, migrate to a supported platform
3. **Remove `unsafe-eval`** from exam portal CSP — this is the most dangerous CSP relaxation

### Short-term

4. **Harden Joomla admin access** — Restrict /administrator to IP whitelist or VPN; add 2FA
5. **Publish post-incident report** for the 2022 ransomware attack — transparency builds trust
6. **Add HSTS to aiimsexams.ac.in** — even the modern portal lacks HTTPS enforcement
7. **Conduct security audit of ORBO portal** — verify the July 2025 vulnerability is fully remediated and no similar issues exist

### Structural

8. **Establish a Vulnerability Disclosure Program (VDP)** — AIIMS currently has no public channel for security researchers
9. **Implement network segmentation** — separate the CMS, exam portal, and hospital systems to prevent lateral movement
10. **Regular penetration testing** — given the high-value target status and prior APT attention, annual pentesting should be mandatory
11. **Incident response transparency** — publish regular security bulletins to build trust with patients, students, and the research community

---

*This is analysis #38 in an ongoing series examining the security architecture of India's digital public infrastructure. All findings are based on publicly observable signals and responsible disclosure principles.*

*Dashboard: [govt-security-audit](https://cashlessconsumer.zo.space/govt-security-audit)*
