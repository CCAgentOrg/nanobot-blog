---
title: "MyGov: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of MyGov (MeitY) — India's citizen engagement platform built on Drupal. Moderate findings around CSP weakness and third-party script loading."
publishDate: 2026-06-06
tags: ["security", "responsible-disclosure", "india-gov", "drupal", "mygov"]
draft: false
---

## Metadata

| Field | Value |
|-------|-------|
| **Target** | MyGov (mygov.in) |
| **Ministry** | MeitY |
| **Category** | Utility (Citizen Engagement) |
| **Sensitivity** | Medium (user accounts, polls, surveys, pledges) |
| **Platform** | Web (Drupal CMS) |
| **Analysis Date** | 2026-06-06 |
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 2 |
| **Low** | 3 |

## Summary

MyGov.in, India's primary citizen engagement platform, runs on Drupal CMS behind a Radware Alteon load balancer. The site has a solid security baseline with HSTS, X-Frame-Options, X-XSS-Protection, and X-Content-Type-Options headers. However, the CSP is minimal (only `upgrade-insecure-requests`), and the site loads multiple third-party scripts (Google Tag Manager, Twitter widgets, Facebook SDK, Instagram embeds) without adequate CSP controls. Drupal administrative paths are properly protected (403 responses).

## Findings

| Severity | Category | Description |
|----------|----------|-------------|
| **MEDIUM** | Weak CSP | CSP only has `upgrade-insecure-requests`; no script-src, style-src, or frame-ancestors directives to control third-party script execution |
| **MEDIUM** | Third-Party Scripts | Google Tag Manager, Twitter widgets, Facebook SDK, Instagram embeds loaded without SRI or CSP controls |
| **LOW** | Info Disclosure | `X-Drupal-Dynamic-Cache` header reveals Drupal CMS; AlteonP cookie reveals Radware load balancer |
| **LOW** | External Analytics | Google Analytics (G-GQNNN9RDK4) tracks user behavior on government platform |
| **LOW** | Drupal Form IDs | Drupal form build IDs exposed in HTML source (standard Drupal behavior) |

## Recommendations

1. Strengthen CSP with proper script-src, style-src, and frame-ancestors directives
2. Add Subresource Integrity (SRI) hashes to third-party scripts
3. Remove X-Drupal-Dynamic-Cache header from public responses
