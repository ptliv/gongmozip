# Gongmozip AdSense-Oriented Full Layout Redesign Plan

## TL;DR

- Goal: Redesign the public Gongmozip experience so it reads as a useful contest decision/report and preparation magazine, not a thin contest directory.
- Success means measurable AdSense-readiness improvements, stronger original editorial value, preserved SEO/indexing behavior, and verified responsive browser evidence. It does not depend on an external AdSense outcome.
- Effort: Large. Recommended execution: 3 waves plus final verification.
- Parallelism: Yes, but only after baseline capture. High-conflict files are serialized.
- Critical path: baseline evidence -> design primitives -> detail-page behavior lock/refactor -> home/list/detail/guide redesign -> SEO/browser verification.
- Default commit policy: do not commit unless the user asks.

## Why This Plan Exists

The AdSense rejection shown by the user was for a policy issue labeled "value-light content" on `gongmozip.com`. The safest response is not to sprinkle more text into the same listing layout. The site should change its first impression and repeated page structure from "aggregated list of contests" to "original judgment, preparation guidance, and evidence-backed contest reports."

Official policy baseline checked on 2026-06-20 KST:

- Google AdSense Program policies: https://support.google.com/adsense/answer/48182?hl=ko
- Google AdSense site readiness guidance: https://support.google.com/adsense/answer/7299563?hl=ko
- Google AdSense policy change log: https://support.google.com/adsense/answer/9336650?hl=ko

Policy translation into implementation criteria:

- Pages must have a clear unique advantage, not just replicated contest facts.
- Navigation must be obvious, readable, and functional.
- External/source-derived content must be surrounded by original expertise, review, improvement suggestions, or opinion.
- Trust, privacy, terms, contact, and site ownership signals must remain reachable.
- Ad placement must not imitate navigation or content. Do not add new ad-slot layout work before approval unless separately requested.

## Product Direction

### Positioning

Use this framing across the redesigned public pages:

> Gongmozip is a contest decision desk: it helps students and creators decide what to apply for, why it is worth their time, and how to prepare.

The site should answer these questions on each major surface:

- Is this contest worth my time?
- Who is it best for?
- How hard is it?
- What is the preparation path?
- What evidence supports that recommendation?
- What should I read next before applying?

### Visual Direction

- Style: calm editorial utility, like an application report desk plus a preparation magazine.
- Assets: use real contest poster/thumbnail images where available. Avoid purely decorative image blocks.
- Palette: warm neutral page background, graphite text, amber/prize accent, emerald/prep accent, restrained blue for links and active controls.
- Avoid: dominant purple gradients, one-hue themes, decorative orbs, bokeh backgrounds, nested cards, and marketing-only hero composition.
- Shape: cards and panels should stay at 8px radius or less unless an existing component already requires otherwise.
- Density: operational and scannable. The user should see decision information quickly, then deeper editorial material.
- Typography: no viewport-scaled font sizes, no negative letter spacing, no oversized hero type inside compact panels.
- Components: use existing Tailwind patterns and lucide-react icons. Do not introduce a new UI framework.

## Scope

### In

- Global public shell: header, footer, mobile nav, trust links.
- Home: `src/app/(main)/page.tsx` and home sections.
- Contest listing: `src/app/(main)/contests/page.tsx`, `ContestsPageClient`, `FilterBar`, `ContestCard`, `ContestGrid`.
- Contest detail: `src/app/(main)/contests/[slug]/page.tsx` and supporting extracted modules.
- Guides: `/guides`, `/guide/[slug]`, `/guides/[slug]`, `src/data/guides.ts`, `GuideArticleDetail`.
- Trust pages: about, contact, privacy, terms where they exist.
- SEO/indexing: sitemap, noindex sitemap, robots, canonical, structured data, AdSense loader preservation.
- Browser QA, screenshot evidence, route-level content checks.

### Out

- Admin UI.
- Auth.
- Crawlers and source scrapers.
- Database schema and Supabase migrations.
- Contest ingestion/scoring data changes unrelated to the public layout.
- New monetization/ad placement experiments.
- Production deploy unless separately requested.

## Repository Facts

- Framework: Next.js 14 App Router, React 18, Tailwind, Supabase.
- Icon library available: `lucide-react`.
- Canonical host default: `https://www.gongmozip.com` unless `NEXT_PUBLIC_SITE_URL` or the deployment environment intentionally overrides it.
- Current verification scripts:
  - `npm run lint`
  - `npx tsc --noEmit -p tsconfig.json`
  - `npm run build`
  - `python scripts/deploy/check_seo_surface.py --base-url https://www.gongmozip.com`
  - `python scripts/deploy/check_production_urls.py --base-url https://www.gongmozip.com`
- No first-class `test`, `typecheck`, or `e2e` script is currently declared in `package.json`.
- High-risk large files observed:
  - `src/app/(main)/contests/[slug]/page.tsx` around 1133 pure LOC.
  - `src/lib/contest-analysis.ts` around 487 pure LOC.
  - `src/data/guides.ts` around 456 pure LOC.
- Dirty worktree exists. Executor must preserve user changes and never revert unrelated edits.

## Non-Negotiable Guardrails

- Do not revert user edits.
- Do not edit high-conflict files in parallel:
  - `src/app/(main)/contests/[slug]/page.tsx`
  - `src/lib/contest-analysis.ts`
  - `src/data/guides.ts`
- Every touched TypeScript/TSX module should end at or below 250 pure LOC where practical. If impossible, document why and split the next obvious module.
- Preserve home/list empty-state behavior when Supabase fetches fail.
- Preserve detail `notFound()` behavior and canonical redirect behavior.
- Preserve `NOINDEX_FOLLOW_ROBOTS` for the contest listing route.
- Preserve contest index decisions, sitemap filtering, noindex sitemap, and `/admin` robots disallow rules.
- Preserve root metadata and `AdSenseLoader`.
- Avoid heavy new dependencies. One-off browser tooling is allowed for QA only if it is not added to `dependencies`.
- Do not add ad slots or ad-like content blocks as part of this redesign.

## Target Information Architecture

### Global Shell

- Header sections: 공모전 찾기, 마감임박, 준비 가이드, 지원 판단 리포트, 소개/문의.
- Mobile nav: same IA, icon-assisted, no ambiguous menu labels.
- Footer: about, contact, privacy, terms, sitemap/trust links.
- Trust line: explain what Gongmozip does and how contest information is reviewed.

### Home

Recommended section order:

1. Decision desk hero: "오늘 지원할 만한 공모전" with a compact recommendation summary, not a marketing hero.
2. Deadline and fit dashboard: deadline-soon, beginner-friendly, prize-heavy, portfolio-worthy.
3. Editorial curation: "이번 주 지원 판단 리포트" with original reasoning snippets.
4. Category/field explorer: dense, scannable taxonomy.
5. Preparation magazine: guides grouped by first-time, planning, submission, portfolio.
6. Trust/quality band: data freshness, source checking, and site policy links.

### Contest Listing

- Keep the route noindex/follow.
- Make it a workbench for filtering and comparison, not just a grid.
- Each card must surface at least:
  - fit verdict,
  - difficulty/effort,
  - deadline pressure,
  - evidence/source freshness,
  - prize/benefit,
  - one preparation cue.
- Search/filter URL behavior must stay stable.

### Contest Detail

Recommended section order:

1. Above-fold report header: title, host, deadline, fit verdict, difficulty, source freshness.
2. "지원 판단": recommended for / think twice if / avoid if.
3. "왜 이렇게 봤나": evidence-backed reasoning from deadline, eligibility, prize, category, source.
4. "준비 체크리스트": 3-6 concrete preparation steps.
5. "마감 전 일정표": timeline based on days left.
6. "비슷한 공모전": internal discovery.
7. "관련 가이드": editorial guide links.
8. Raw contest facts and source link: still present, but not the page's only value.
9. FAQ/structured data where valid.

### Guides

- Treat guides as a magazine surface, not a small blog appendix.
- Add typed article sections where useful:
  - summary,
  - who it helps,
  - step-by-step,
  - checklist,
  - mistakes,
  - examples,
  - related contest filters.
- Keep `/guide/[slug]` as canonical.
- Preserve `/guides/[slug]` as an alias only if redirects/canonicals remain correct.

## Dependency Matrix

- Task 0 blocks all implementation.
- Task 1 blocks public UI tasks.
- Task 2 should happen before Task 6 and Task 7 if detail-page files remain oversized.
- Task 3 should happen before Task 6, Task 7, and Task 8 if guide data becomes richer.
- Task 4 can run after Task 1 and in parallel with Task 5.
- Task 5 can run after Task 1 and in parallel with Task 4.
- Task 6 depends on Task 2 and Task 3.
- Task 7 depends on Task 3.
- Task 8 depends on all route changes.
- Task 9 depends on Task 8.

## Execution Plan

### Task 0: Baseline And Evidence Lock

Purpose: protect the dirty worktree and capture current behavior before redesign.

References:

- `package.json`
- `src/app/(main)/page.tsx`
- `src/app/(main)/contests/page.tsx`
- `src/app/(main)/contests/[slug]/page.tsx`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/app/sitemap-noindex.xml/route.ts`
- `src/lib/indexing.ts`
- `src/lib/seo.ts`

Work:

- Record `git status --short` into `.omo/evidence/00-git-status-before.txt`.
- Record line counts for key files into `.omo/evidence/00-line-counts-before.txt`.
- Pick one representative contest slug from current data or sitemap and record it in `.omo/evidence/00-representative-routes.txt`.
- Capture current browser screenshots for `/`, `/contests`, representative `/contests/<slug>`, `/guides`, and representative `/guide/<slug>`.
- Record current canonical/noindex/structured-data snippets for the same routes.

Acceptance criteria:

- Evidence files exist under `.omo/evidence/`.
- Representative slug is real and reachable locally.
- Current route failures, if any, are documented before edits.
- No source code is changed by this task.

QA scenarios:

- Happy path: local dev server renders all representative public routes.
- Failure path: if Supabase data is unavailable, record empty-state screenshots and continue with the nearest static route.
- Evidence:
  - `.omo/evidence/00-home-before-390.png`
  - `.omo/evidence/00-home-before-1440.png`
  - `.omo/evidence/00-detail-before-1440.png`
  - `.omo/evidence/00-route-metadata-before.txt`

Parallelization: no. This is the lock step.

### Task 1: Design Tokens And Shared Layout Primitives

Purpose: create a small, local UI foundation for the redesign without adding a design-system dependency.

References:

- `src/app/globals.css`
- `src/components/layout/Header.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/ui/ContestGrid.tsx`
- `src/components/contest/ContestCard.tsx`
- `tailwind.config.ts` if present

Work:

- Add or refine reusable class patterns for bands, report headers, metric rows, evidence chips, source freshness, and section headings.
- Prefer Tailwind composition and small React components over broad CSS rewrites.
- Use lucide icons for tool/action controls.
- Keep cards and panels at 8px radius or less.
- Ensure stable dimensions for cards, filters, image slots, buttons, and repeated metrics.

Acceptance criteria:

- Shared primitives are used by at least two public surfaces.
- No nested-card layout is introduced.
- No new dependency is added.
- Text does not overflow in Korean labels at 390px width.
- Touched modules satisfy the 250 pure LOC target or are split.

QA scenarios:

- Happy path: shared components render in home/list/detail without layout shift.
- Edge path: long Korean contest title wraps cleanly inside card/report header.
- Evidence:
  - `.omo/evidence/01-shared-components-mobile.png`
  - `.omo/evidence/01-shared-components-desktop.png`

Parallelization: limited. Can be done while another worker reads but not edits route files.

### Task 2: Contest Detail Behavior Lock And Decomposition

Purpose: reduce the blast radius of the largest file before changing its layout.

References:

- `src/app/(main)/contests/[slug]/page.tsx`
- `src/lib/contest-analysis.ts`
- `src/lib/contest-text.ts`
- `src/components/seo/StructuredData.tsx`
- `src/lib/indexing.ts`
- `src/lib/seo.ts`

Work:

- Extract pure helper/build functions out of the detail page into focused modules.
- Keep metadata generation, canonical redirect, `notFound()`, FAQ JSON-LD, and existing contest facts behavior equivalent.
- Add minimal deterministic checks or scriptable assertions for representative contest analysis output.
- Split high-LOC modules where the split is obvious:
  - analysis score/view-model helpers,
  - detail sections,
  - metadata/structured-data builders.

Acceptance criteria:

- Representative contest detail route renders before visual redesign.
- Canonical URL remains `https://www.gongmozip.com/contests/<slug>` unless env overrides the host.
- Non-indexable contests keep their expected robots behavior.
- `buildPublicContestAnalysis` semantics are preserved for representative contests.
- Touched TS/TSX files are at or below 250 pure LOC where practical.

QA scenarios:

- Happy path: valid slug renders detail, metadata, JSON-LD, source link, and analysis.
- Failure path: invalid slug returns not found.
- SEO path: alternate/canonical slug behavior remains correct.
- Evidence:
  - `.omo/evidence/02-detail-behavior-after-refactor.txt`
  - `.omo/evidence/02-detail-refactor-1440.png`

Parallelization: no. This is a high-conflict task.

### Task 3: Guide Data Model And Article Surface Preparation

Purpose: make guide pages substantial enough to support the "preparation magazine" role.

References:

- `src/data/guides.ts`
- `src/components/guide/GuideArticleDetail.tsx`
- `src/app/(main)/guides/page.tsx`
- `src/app/(main)/guide/[slug]/page.tsx`
- `src/app/(main)/guides/[slug]/page.tsx`

Work:

- Extend the guide article type with richer optional sections.
- Migrate every guide to the new model without losing current paragraphs/checklists.
- Keep `/guide/[slug]` canonical.
- Decide alias behavior for `/guides/[slug]`: preserve as canonical-alias with correct canonical metadata or redirect to `/guide/[slug]`.
- Add article layout sections for summary, steps, mistakes, checklist, and related contest discovery.

Acceptance criteria:

- All existing guides render.
- `/guide/<slug>` canonical metadata is stable.
- `/guides/<slug>` does not create duplicate-canonical confusion.
- Guide pages contain original preparation guidance, not only generic intro copy.
- Guide data/components are split if they exceed the 250 pure LOC target.

QA scenarios:

- Happy path: guide index links to canonical guide detail routes.
- Alias path: `/guides/<slug>` resolves with correct canonical/redirect behavior.
- Edge path: guide with no optional section still renders cleanly.
- Evidence:
  - `.omo/evidence/03-guides-index-390.png`
  - `.omo/evidence/03-guide-detail-1440.png`
  - `.omo/evidence/03-guide-canonical.txt`

Parallelization: no edits in parallel with Task 2 if both affect shared analysis/links. Otherwise one worker may handle guides after Task 1.

### Task 4: Global Shell And Trust Navigation Redesign

Purpose: make navigation and trust signals obvious, usable, and policy-aligned.

References:

- `src/app/(main)/layout.tsx`
- `src/app/layout.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Footer.tsx`
- `src/app/(main)/about/page.tsx` if present
- `src/app/(main)/contact/page.tsx` if present
- `src/app/(main)/privacy/page.tsx` if present
- `src/app/(main)/terms/page.tsx` if present

Work:

- Reframe header around decision and preparation paths.
- Keep mobile nav compact and icon-assisted.
- Ensure trust/legal links are visible in footer.
- Keep `AdSenseLoader` in root layout.
- Add a short trust statement in footer or about page that explains source checking and editorial judgment.

Acceptance criteria:

- Header nav works on 390px, 768px, and 1440px widths.
- Footer links to about/contact/privacy/terms where routes exist.
- `/admin` remains untouched and disallowed in robots.
- Root metadata and `AdSenseLoader` are preserved.

QA scenarios:

- Happy path: desktop nav links reach intended routes.
- Mobile path: menu opens/closes without occluding content permanently.
- Trust path: legal/contact pages are reachable without search.
- Evidence:
  - `.omo/evidence/04-header-mobile-open.png`
  - `.omo/evidence/04-footer-trust-links.png`
  - `.omo/evidence/04-robots-admin.txt`

Parallelization: yes after Task 1, as long as no other worker edits `Header.tsx` or `Footer.tsx`.

### Task 5: Home Redesign Into A Decision Desk

Purpose: make the first viewport immediately communicate original value.

References:

- `src/app/(main)/page.tsx`
- `src/components/home/HeroSection.tsx`
- `src/components/home/CategorySection.tsx`
- `src/components/home/DeadlineSoonSection.tsx`
- `src/components/home/AnalysisCurationSection.tsx`
- `src/components/home/LatestContestsSection.tsx`
- `src/components/home/GuideSection.tsx`
- `src/components/home/CTASection.tsx`
- `src/lib/contest-analysis.ts`

Work:

- Replace generic portal feel with a compact decision dashboard.
- Add original reasoning snippets in curation cards.
- Promote guide content as preparation magazine, not a trailing CTA.
- Keep empty-data fallback when Supabase fetches fail.
- Keep first viewport useful on mobile without giant decorative hero.

Acceptance criteria:

- Above the fold on 390px and 1440px shows what the site uniquely does.
- Home includes decision, deadline, curation, category, guide, and trust sections.
- At least one section explains why a contest is recommended, not just what it is.
- Empty data state still renders a coherent page.
- No text overlap or button label overflow.

QA scenarios:

- Happy path: verified contest data renders decision dashboard.
- Empty path: forced or simulated empty contest array renders fallback.
- Long text path: long title and host names wrap without layout shift.
- Evidence:
  - `.omo/evidence/05-home-390.png`
  - `.omo/evidence/05-home-768.png`
  - `.omo/evidence/05-home-1440.png`
  - `.omo/evidence/05-home-empty-state.png`

Parallelization: yes after Task 1. Avoid parallel edits to shared home section components.

### Task 6: Contest Listing Workbench Redesign

Purpose: make `/contests` useful as a comparison/filtering workbench while preserving noindex and URL behavior.

References:

- `src/app/(main)/contests/page.tsx`
- `src/components/contest/ContestsPageClient.tsx`
- `src/components/contest/FilterBar.tsx`
- `src/components/contest/ContestCard.tsx`
- `src/components/ui/ContestGrid.tsx`
- `src/types/contest.ts`
- `src/lib/indexing.ts`

Work:

- Redesign list header as a practical workbench, not a generic title.
- Add comparison metrics into cards using existing analysis data.
- Preserve search debounce, URL params, reset behavior, pagination, and "more" loading.
- Keep `/contests` noindex/follow.
- Keep filters dense but readable on mobile.

Acceptance criteria:

- Search updates results and URL predictably.
- Category/target/field/type/deadline filters still work.
- Reset clears state.
- Pagination or "more" behavior remains intact.
- Contest cards show original analysis cues.
- Route metadata keeps noindex/follow.

QA scenarios:

- Happy path: open `/contests?sort=recommended`, apply a category filter, open a card.
- Search path: type Korean search term, wait for debounce, verify URL/result update.
- Reset path: clear all filters and verify URL state.
- Empty path: no results state is helpful and not broken.
- Evidence:
  - `.omo/evidence/06-contests-390.png`
  - `.omo/evidence/06-contests-filtered-1440.png`
  - `.omo/evidence/06-contests-url-behavior.txt`
  - `.omo/evidence/06-contests-noindex.txt`

Parallelization: yes after Task 1, but not with another worker editing `ContestCard.tsx` or `ContestsPageClient.tsx`.

### Task 7: Contest Detail Report Redesign

Purpose: make each detail page the strongest AdSense-readiness surface by adding original judgment, evidence, and preparation guidance.

References:

- `src/app/(main)/contests/[slug]/page.tsx`
- Extracted modules from Task 2
- `src/lib/contest-analysis.ts`
- `src/lib/contest-text.ts`
- `src/components/seo/StructuredData.tsx`
- `src/app/sitemap.ts`
- `src/lib/indexing.ts`

Work:

- Rebuild detail layout into the report structure from Target Information Architecture.
- Surface fit verdict, who should apply, who should skip, difficulty, deadline pressure, and preparation checklist near the top.
- Keep raw contest facts and source link visible, but make them supporting evidence rather than the whole content.
- Add links to related guides and similar contests.
- Preserve JSON-LD and metadata.

Acceptance criteria:

- Representative detail page contains at least:
  - fit verdict,
  - evidence/reasoning,
  - preparation checklist,
  - source link/freshness,
  - related guide links,
  - raw facts.
- Structured data validates syntactically in page HTML.
- Canonical and robots behavior match pre-redesign expectations.
- Invalid slug still returns not found.
- Page has no large duplicate/generic text block repeated across all contests without contest-specific values.

QA scenarios:

- Happy path: representative indexed contest renders full report.
- No-image path: contest without poster uses stable fallback without broken image.
- Deadline path: expired or near-deadline contest labels do not mislead.
- SEO path: page metadata, canonical, and JSON-LD are present.
- Evidence:
  - `.omo/evidence/07-detail-390.png`
  - `.omo/evidence/07-detail-768.png`
  - `.omo/evidence/07-detail-1440.png`
  - `.omo/evidence/07-detail-metadata.txt`
  - `.omo/evidence/07-detail-invalid-slug.txt`

Parallelization: no. This remains high-conflict and should run after Task 2.

### Task 8: Guide And Trust Page Redesign

Purpose: make preparation content and trust pages strong enough to support the public site's credibility.

References:

- `src/app/(main)/guides/page.tsx`
- `src/app/(main)/guide/[slug]/page.tsx`
- `src/app/(main)/guides/[slug]/page.tsx`
- `src/components/guide/GuideArticleDetail.tsx`
- `src/data/guides.ts`
- trust/legal page routes where present

Work:

- Redesign guide index as magazine navigation with topic groupings.
- Redesign article detail for scannable preparation steps.
- Add related contest discovery links where natural.
- Refresh about/contact/privacy/terms presentation if those pages are too thin or hard to find.
- Keep legal text accurate; do not invent policy claims.

Acceptance criteria:

- Guide index clearly presents preparation topics.
- Each guide article has original, practical advice beyond a short intro.
- Canonical route behavior is verified for `/guide` and `/guides` variants.
- Trust/legal pages are reachable from header or footer.
- No guide page becomes a doorway page or thin index.

QA scenarios:

- Happy path: guide index -> guide detail -> related contest route.
- Alias path: `/guides/<slug>` behavior matches decided route strategy.
- Trust path: contact/privacy/terms/about reachable from footer.
- Evidence:
  - `.omo/evidence/08-guides-390.png`
  - `.omo/evidence/08-guide-article-1440.png`
  - `.omo/evidence/08-trust-pages.txt`

Parallelization: yes after Task 3, unless it conflicts with shell/footer edits.

### Task 9: SEO, Indexing, And AdSense-Readiness Verification

Purpose: ensure the redesign did not damage the existing SEO surface and that the AdSense readiness goals are concretely improved.

References:

- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/app/sitemap-noindex.xml/route.ts`
- `src/lib/indexing.ts`
- `src/lib/seo.ts`
- `scripts/deploy/check_seo_surface.py`
- `scripts/deploy/check_production_urls.py`
- `src/app/layout.tsx`

Work:

- Verify canonical host defaults to `https://www.gongmozip.com`.
- Verify `/contests` remains noindex/follow.
- Verify sitemap includes indexable guides and contests only.
- Verify noindex sitemap includes list/noindex surfaces.
- Verify robots still disallows `/admin` and `/admin/*`.
- Verify `AdSenseLoader` remains mounted.
- Run local and post-deploy checks as applicable.

Mandatory local verification:

```powershell
npm run lint
npx tsc --noEmit -p tsconfig.json
npm run build
```

Mandatory browser QA with local dev server:

```powershell
npm run dev
```

Routes to capture at 390x844, 768x1024, and 1440x1100 where meaningful:

- `/`
- `/contests`
- `/contests?sort=recommended`
- representative `/contests/<slug>`
- `/guides`
- representative `/guide/<slug>`
- alias `/guides/<slug>` if preserved
- `/about`
- `/contact`
- `/privacy`
- `/terms`
- `/robots.txt`
- `/sitemap.xml`
- `/sitemap-noindex.xml`

Optional post-deploy verification:

```powershell
python scripts/deploy/check_seo_surface.py --base-url https://www.gongmozip.com
python scripts/deploy/check_production_urls.py --base-url https://www.gongmozip.com
```

Acceptance criteria:

- All mandatory local commands pass or failures are diagnosed with evidence.
- Browser screenshots show no overlapping major UI, unreadable nav, or blank primary content.
- Metadata/canonical/noindex behavior matches the pre-redesign contract.
- AdSense readiness checklist is filled with route evidence.
- No route claims external approval as a certainty.

QA scenarios:

- Happy path: all public routes render and metadata is correct.
- Mobile path: nav, filters, detail report, and guide article are usable at 390px.
- Data path: empty or partial contest data renders sensible fallbacks.
- SEO path: robots/sitemap/noindex/canonical checks pass.
- Evidence:
  - `.omo/evidence/09-lint.log`
  - `.omo/evidence/09-typecheck.log`
  - `.omo/evidence/09-build.log`
  - `.omo/evidence/09-browser-screenshots/`
  - `.omo/evidence/09-seo-local.txt`
  - `.omo/evidence/09-adsense-readiness.md`

Parallelization: verification can be split by route after implementation stabilizes. Final command run is sequential.

## Final Readiness Checklist

The executor can declare the redesign complete only when all of these are true:

- Public pages present original decision/preparation value, not only contest facts.
- Home, listing, detail, guides, and trust routes are responsive and screenshot-verified.
- Contest detail pages include evidence-backed judgment and practical preparation sections.
- Guide pages have expanded editorial substance and canonical route clarity.
- Navigation is clear, readable, and functional on mobile and desktop.
- Trust/legal/contact pages are reachable.
- `AdSenseLoader` remains in root layout.
- No new ad placement work was added.
- `/contests` noindex/follow is preserved.
- Sitemap, noindex sitemap, robots, canonical, and index decisions are preserved.
- `npm run lint`, `npx tsc --noEmit -p tsconfig.json`, and `npm run build` have been run with captured logs.
- Browser QA evidence exists under `.omo/evidence/`.
- Dirty worktree changes from before this plan were not reverted.

## Recommended Worker Split

- Worker A: shared primitives and global shell after Task 0.
- Worker B: home redesign after Task 1.
- Worker C: contest listing redesign after Task 1.
- Main executor only: detail-page decomposition and detail report redesign.
- Worker D: guides/trust pages after Task 3.
- Final executor: SEO/browser verification.

High-conflict serialization remains more important than speed.

## Stop Conditions

Stop and report before continuing if:

- Build fails due to an unrelated pre-existing environment issue that blocks route verification.
- Supabase access prevents selecting any representative contest and no local fallback data exists.
- Existing user edits in a high-conflict file contradict the planned redesign direction.
- Canonical host configuration is inconsistent across environment, metadata, and deployed URL.
- A route needs legal/policy copy that cannot be inferred safely.

## Handoff Prompt For Execution

Use this when starting implementation:

> Execute `.omo/plans/gongmozip-layout-redesign.md` with ULW discipline. Start at Task 0, preserve the dirty worktree, do not revert user edits, serialize high-conflict files, capture evidence under `.omo/evidence/`, and do not claim completion until mandatory local verification and browser QA are done.
