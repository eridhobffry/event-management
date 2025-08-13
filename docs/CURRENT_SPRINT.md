# 🚀 Sprint: UI‑First Landing, Event Pages, Checkout (Aug 19–25, 2025)

Derived from: `docs/UI_UX_GUIDE_2025.md`, `docs/FEATURES_BENCHMARK.md`, `docs/TECH_STACK_2025.md`.

## 🎯 Sprint Goal

- Redesign public landing and event pages (mobile‑first), and ship a clean RSVP/checkout UX for free registrations.

## ✅ Definition of Done

- New marketing landing with clear hero, social proof, primary CTA, and fast LCP. (Hero shipped: single CTA to discovery, social proof strip, mobile-first)
- Event discovery and event detail page refined with prominent “Get tickets/RSVP” CTA.
- Registration/checkout flow: guest by default, progress indicator, trust signals, errors in‑place, fully mobile‑optimized.
- Accessibility (WCAG AA focus states/contrast) and performance (Core Web Vitals) pass.

## 🗂 Scope and Tasks

### A) Marketing Landing (home)

- Implement immersive but simple hero (full‑bleed visual/video optional), single CTA, minimal copy; strong value prop and scroll cues ([Unbounce examples](https://unbounce.com/landing-page-examples/event-landing-page-examples/), [2025 hero trends](https://sitemile.com/best-hero-marquee-design-trends-for-2025-make-your-website-stand-out/)).
- Add lightweight social proof (logos/testimonial) and secondary section linking to events.

Status: Done

- Hero ships with a single primary CTA to `#discover`, compact value‑prop row, and social proof strip.
- Accessibility: visible focus styles verified via `npm test` (a11y focus test).
- Tests: Vitest (`tests/*.test.ts`) validates hero structure/CTA and a11y; Playwright E2E (`e2e/`) validates hero CTA navigation.

### B) Event Discovery/List

- Card/grid with clear date/time, title, location, price badge; mobile cards first.
- Filters: city/date/type (defer advanced facets).
  - Implemented: city, date, and category/type (heuristic from name/description) with improved empty state and quick clear actions.
  - Tests: unit for category inference; E2E for filter flow and empty state.
  - Small wins: added Reset all and URL query param persistence; results count display.

### C) Event Detail

- Above‑the‑fold: title, date/time, venue map link, price/free badge, primary CTA.
- Sections: about, lineup/schedule, FAQs, share.
  
Status: Done

- Implemented above‑the‑fold header with title, formatted date/time, venue Google Maps link, Free badge, and primary “Get Tickets” CTA in `src/app/events/[id]/page.tsx`.
- Added sections: About, Schedule (placeholder timeline), FAQs, Share (WA/IG/X/Copy) via `ShareActions` client component, and “Add to Calendar” (Google/ICS). Included “Similar events” rail placeholder.
- Added absolute URL generation for sharing, ICS download, and Google Calendar deep link.
- Tests: All unit and E2E tests pass (landing CTA, discovery filters). No regressions.

### D) Registration / Checkout (free RSVP baseline)

- Guest checkout, minimal fields, microcopy; show order summary persistently.
- Progress indicator for multistep (info → confirm); promo code field hidden behind link.
- Trust signals (lock, card/wallet badges), clear error handling; mobile wallets later.
- Follow Stripe checkout guidance for form/CTA clarity and trust ([Stripe best practices](https://stripe.com/resources/more/checkout-screen-best-practices), [ecommerce checkout](https://stripe.com/resources/more/ecommerce-checkout-best-practices)).

### E) A11y + Performance

- Contrast, focus states, touch targets ≥44px; lazy images; optimize LCP hero.

### F) Housekeeping

- Archive or merge `sprint-planning/` into `docs/` and remove obsolete duplicates.

## 🔬 QA Checklist

- Mobile first: thumb‑reachable CTAs, single column, sticky primary action.
- Guest checkout works without account; errors are inline and specific.
- No layout shift; LCP ≤ 2s on home and event pages. (Home hero optimized: single image-less gradient, minimal DOM)
- Keyboard navigation and visible focus across interactive elements.

## 📦 Git Plan

- feat(ui): marketing landing hero + sections
- feat(events): discovery list + filters (basic)
- feat(events): event detail page with CTA
- feat(checkout): guest RSVP flow + progress + trust
- chore(a11y/perf): focus/contrast/speed tweaks
- chore(docs): archive `sprint-planning/`, update CURRENT_SPRINT

Branch: `feat/ui-landing-events-checkout`

## 🧭 References

- Event landing patterns and examples: [Unbounce](https://unbounce.com/landing-page-examples/event-landing-page-examples/), [Landingi roundup](https://landingi.com/landing-page/design-examples/)
- Hero/landing trends 2025: [SiteMile](https://sitemile.com/best-hero-marquee-design-trends-for-2025-make-your-website-stand-out/)
- Checkout UX (forms, trust, guest): [Stripe](https://stripe.com/resources/more/checkout-screen-best-practices), [Stripe ecommerce](https://stripe.com/resources/more/ecommerce-checkout-best-practices)
