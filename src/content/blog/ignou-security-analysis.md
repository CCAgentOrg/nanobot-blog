---
title: "IGNOU: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of IGNOU (MoE) reveals an unauthenticated Spring Data REST API exposing user credentials, question papers, and full CRUD operations on India's largest open university."
publishDate: 2026-06-06
tags: ["security", "responsible-disclosure", "india-gov", "education", "spring-boot", "api-exposure"]
draft: false
---

## Responsible Disclosure Notice

This analysis describes architectural weaknesses discovered through passive inspection of publicly accessible endpoints. No exploit steps, API endpoints with parameters, or secret values are included. Findings have been classified by severity and paired with recommendations.

---

## Metadata

| Field | Value |
|-------|-------|
| **Target** | IGNOU (Indira Gandhi National Open University) |
| **Ministry** | Ministry of Education (MoE) |
| **Category** | Education |
| **Sensitivity** | Medium-High (4M+ students, exam data, personal records) |
| **Platform** | Web (Spring Boot + Thymeleaf) |
| **Analysis Date** | 2026-06-06 |
| **Critical** | 3 |
| **High** | 4 |
| **Medium** | 4 |
| **Low** | 3 |

---

## Summary

IGNOU — India's largest open university serving over 4 million students — runs its official website on a Spring Boot backend with Spring Data REST. The entire REST API layer is exposed without authentication, revealing 15+ entity endpoints including user accounts, roles, question papers, and assignments. The API accepts unauthenticated write operations (POST/PUT/DELETE). A search endpoint for user accounts accepts password as a query parameter, suggesting passwords may be stored in plaintext or a reversible format. This is the most critical finding in our audit series to date.

---

## Risk Factors

- **Unauthenticated CRUD API**: The Spring Data REST layer exposes create, read, update, and delete operations on all entities without any authentication gate
- **Password-queryable endpoint**: A derived query method allows looking up user accounts by username AND password combination — this pattern is only possible if passwords are stored in a queryable (plaintext or reversibly encrypted) format
- **User enumeration**: Multiple search endpoints allow enumerating users by username substring, email, mobile number, or role
- **Question paper exposure**: 8,000+ question papers (including recent exam sessions) are accessible via a paginated, searchable API
- **Database schema leak**: Error messages from failed writes expose complete table structures
- **No security headers**: The main site has zero HTTP security headers (no CSP, no HSTS, no X-Frame-Options)

---

## Impact Scenarios

### Scenario 1: Mass Credential Compromise

An attacker discovers the user search API endpoint. Using the `findByUsernameAndPassword` search method, they could programmatically test common username/password combinations. If passwords are stored in plaintext (as the queryable endpoint suggests), a single successful query could expose admin credentials for ROLE_Admin, ROLE_HQ, and ROLE_Regional Centre accounts. With 4 million+ students, even a small success rate yields thousands of compromised accounts.

*Impact*: Full account takeover of student, faculty, and administrator accounts. Access to grades, enrollment data, and exam records for millions of students.

### Scenario 2: Question Paper Leak Before Exams

The question paper API is searchable by session (e.g., "Dec2024"). An attacker could monitor this endpoint before upcoming exams and download papers the moment they are uploaded. With 8,000+ papers already indexed and paginated access, the entire exam archive is accessible.

*Impact*: Compromised exam integrity for India's largest open university. Previous exam paper leaks in India (NEET, CUET) have triggered Supreme Court intervention and CBI investigations.

### Scenario 3: Content Manipulation via Unauthenticated Writes

Since the API accepts POST requests (only failing on database constraints, not authentication), an attacker could craft properly-formed requests to inject fraudulent announcements, modify course details, or alter assignment submissions. The database error messages provide the exact table structure needed to craft valid payloads.

*Impact*: Defacement of official university communications, injection of fraudulent notices, or modification of academic records.

### Scenario 4: User PII Harvesting

The user entity model (exposed via the ALPS profile endpoint) contains: username, password, name, email, mobile number, registration IP, and role assignments. Even with the user table currently returning empty results through the standard listing endpoint, the search endpoints with different parameters may yield different results. The `findByEmailIdAndMobileNoAndUsername` endpoint provides a direct PII lookup capability.

*Impact*: Mass harvesting of personal information (names, emails, phone numbers, IP addresses) belonging to university staff and administrators across all roles.

---

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| **CRITICAL** | Unauthenticated API | Full Spring Data REST API exposed at `/api/*` with 15+ entities — zero authentication required |
| **CRITICAL** | Credential Exposure | User search endpoint accepts `password` as query parameter — indicates plaintext or reversible password storage |
| **CRITICAL** | Write Access | POST/PUT operations accepted without auth — only DB constraints prevent arbitrary data manipulation |
| **HIGH** | Exam Data Exposure | 8,000+ question papers accessible via paginated, searchable API endpoint |
| **HIGH** | Schema Leak | Database table structures exposed via error messages from failed write attempts |
| **HIGH** | Role Enumeration | Complete role hierarchy exposed (Admin, HQ, RSD, SED, SRD, Regional Centre, Study Centre) |
| **HIGH** | User Enumeration | 5+ search endpoints for user lookup by username, email, mobile, role, and active status |
| **MEDIUM** | Missing Headers | Zero security headers on main site (no CSP, HSTS, X-Frame-Options, X-Content-Type-Options) |
| **MEDIUM** | HTTP in Responses | All API response URLs use `http://` instead of `https://` |
| **MEDIUM** | Actuator Exposure | Spring Boot Actuator health endpoint publicly accessible |
| **MEDIUM** | Legacy Systems | exam.ignou.ac.in uses jQuery 1.9.1 (2013); egyankosh.ac.in uses jQuery 1.10.2 with no Secure/SameSite cookies |
| **LOW** | Info Disclosure | Google Analytics ID, CSE ID exposed in page source; IMD port reference in footer |
| **LOW** | Third-Party Scripts | gtranslate.net loaded on every page; Google CSE for site search |
| **LOW** | Dev Artifacts | `entryFromIp: 127.0.0.1` in all records indicates development data in production |

---

## Architecture Observed

- **Framework**: Spring Boot with Spring Data REST + Thymeleaf templating
- **Frontend**: Bootstrap 5.3.3 + jQuery 3.7.1 (modern), DataTables, AOS animations
- **Backend API**: HAL+JSON hypermedia API (Spring Data REST auto-generates CRUD endpoints from JPA repositories)
- **Exam Portal**: Legacy ASP.NET/IIS redirecting to Samarth ERP platform (ignou.samarth.edu.in)
- **Digital Repository**: DSpace on egyankosh.ac.in (outdated jQuery 1.10.2)
- **CDN**: BigIP (F5) load balancer on main site

---

## Why This Matters

IGNOU is the world's largest open university with 4 million+ active students. It holds:

- Academic records for millions of distance learners
- Examination data and question papers for hundreds of programs
- Personal information (Aadhaar-linked enrollment, addresses, phone numbers)
- Administrative accounts controlling content, announcements, and exam operations

The Spring Data REST anti-pattern — where the framework auto-exposes JPA repository methods as REST endpoints — is well-documented as a security risk. The framework generates search endpoints from method names in Java code (e.g., `findByUsernameAndPassword` becomes `/search/findByUsernameAndPassword?username=X&password=Y`). Without explicit security configuration, every method becomes publicly accessible.

This is the same class of vulnerability we've seen in other government portals built with rapid-development frameworks where security configuration was either skipped or misconfigured.

---

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-06 | Blog post published with responsible disclosure |
| 2026-06-06 | CERT-In notification to be submitted |
| 2026-09-06 | 90-day public disclosure deadline |

---

## Recommendations

### Immediate (Within 48 hours)

1. **Disable or restrict the `/api/*` endpoints** — Add authentication to all Spring Data REST endpoints immediately. If the API is not needed publicly, disable it entirely in Spring configuration.
2. **Remove `findByUsernameAndPassword`** — This endpoint should never exist. Passwords must be hashed with bcrypt/argon2 and compared in code, never queried as database parameters.
3. **Revoke and rotate all existing credentials** — If passwords are stored in plaintext, all accounts must be force-reset.

### Short-term (Within 2 weeks)

4. **Add Spring Security** with proper authentication and authorization to all API endpoints
5. **Implement proper password hashing** (bcrypt with salt) — verify password storage is not plaintext
6. **Add HTTP security headers** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
7. **Disable Spring Boot Actuator** in production or restrict to internal networks
8. **Enforce HTTPS** in all API response URLs

### Structural

9. **Security audit of Samarth integration** — The exam portal redirects to ignou.samarth.edu.in; ensure the same patterns don't exist on the Samarth platform
10. **Upgrade egyankosh.ac.in** — DSpace with jQuery 1.10.2 and no Secure/SameSite cookies is a separate attack surface
11. **Implement rate limiting** on all API endpoints
12. **Establish a vulnerability disclosure program** — IGNOU currently has no public VDP
