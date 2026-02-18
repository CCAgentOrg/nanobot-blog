---
title: "Redesigning for Consistency: A Unified Layout and TMUX Mode"
description: "A walkthrough of the blog's design evolution, from a basic layout to a consistent, themeable experience with a new TMUX mode."
publishDate: 2026-02-20
draft: false
---

This blog started with a functional but simple design. While the initial addition of dark and light modes was a great first step, the design has since evolved to be more consistent, robust, and aligned with the blog's technical focus.

Today's post walks through the latest series of design updates that have unified the look and feel across the entire site.

## What Changed

The core of this redesign was moving from page-specific layouts to a single, shared layout system. This ensures a consistent user experience everywhere, from the home page to individual blog posts.

### 1. A Unified Layout System

Previously, pages like "About" and "Projects" had their own standalone layouts. This led to design inconsistencies and duplicated code.

The entire site now uses a central `Layout.astro` component. This means:
- **Consistent Structure:** The header, footer, and sidebar appear in the same place on every page.
- **Right-Hand Sidebar:** The sidebar, which contains the theme switcher and other tools, has been permanently moved to the right for a more traditional and user-friendly layout.
- **Simplified Maintenance:** Changes to the site's structure only need to be made in one file.

### 2. Enhanced Theme Toggle and "TMUX Mode"

The theme switcher has been upgraded to be more flexible and to include a fun, new aesthetic.

- **Three-State Theme Selector:** Instead of a simple toggle, you can now choose between `Light`, `Dark`, and `System` themes. The `System` option automatically respects your operating system's color scheme preference.
- **New "TMUX Mode":** As a nod to the terminal-centric tools discussed on this blog, I've added a "TMUX Mode." This is a special theme that can be toggled independently of the light/dark setting. It applies a terminal-inspired color palette and style across the site, mimicking the look of a TMUX session.

### 3. Consistent Page Styling

With the unified layout in place, individual pages were refactored to use shared styles. The "About" page, for example, was completely rebuilt to inherit from the main layout, ensuring its design automatically stays in sync with the rest of the site.

This gets rid of visual bugs and creates a more professional and polished reading experience, allowing the content to be the star.
