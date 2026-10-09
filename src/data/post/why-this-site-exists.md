---
publishDate: 2026-10-09T20:18:02.342Z
draft: false
title: Why this site exists
excerpt: I build camera and optical systems — the kind that have to survive contact with mass production. Most of my work sits where optics, imaging pipelines, and
category: Optics
tags:
  - Optics
  - Hardware
  - System Design
  - Career
author: Peng Zhao
---

I build camera and optical systems — the kind that have to survive contact with mass production. Most of my work sits where optics, imaging pipelines, and increasingly machine learning meet, and the interesting problems are almost never inside one discipline.

This site is where I write down the parts that are not confidential.

## What I plan to write about

- Optical system architecture and the trade-offs that actually bind once a design reaches production
- Imaging pipelines, from sensor through the processing chain, and where models help or hurt
- Hardware that has to ship: tolerances, validation, yield, and the gap between a working prototype and a working product
- Notes on building a career across hardware and AI

## How this site is built

The site is a static build. Posts live as plain Markdown, and a small sync script in the repository turns drafts into published pages, so writing stays a matter of opening a text file.

```sh
npm run sync:posts -- --write
npm run build
```

That is the whole workflow. No content management system, no database, nothing that can rot.

If any of this is useful to you, or you want to argue with it, the links are in the footer.
