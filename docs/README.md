# Discover Tarkarli — Documentation

| Doc | What's inside |
|---|---|
| [vision.md](vision.md) | **The direction**: discovertarkarli.com marketplace, Golden Tide Retreat as partner #1, the technical changes it drives |
| [context/README.md](context/README.md) | **Start here for any AI tool or new contributor**: requirements, working rules, history, current handoff |
| [architecture.md](architecture.md) | Layers, module map, request flows, extension points |
| [booking-rules.md](booking-rules.md) | Stay, occupancy, meals, cutoff, pricing, GST, deposit rules |
| [data-model.md](data-model.md) | Tables, constraints, triggers, migrations |
| [payments.md](payments.md) | Razorpay deposit flow, webhooks, edge cases, adding providers |
| [razorpay-onboarding.md](razorpay-onboarding.md) | **TODO**: step-by-step Razorpay account, keys, webhook, go-live checklist |
| [region-migration.md](region-migration.md) | **TODO**: move Vercel and Supabase to Mumbai, step by step |
| [auth.md](auth.md) | Sign-in: Auth.js + Google (**TODO setup**), roles, phone OTP plan |
| [release-process.md](release-process.md) | **How work ships**: branch, PR, owner approval, merge, version tag, Vercel deploy, rollback |
| [workflows/vibe-coding.md](workflows/vibe-coding.md) | **Proposed fast mode** (direct to main, no PRs, no tags). Not active until the owner confirms |
| [marketing.md](marketing.md) | Branding pillars (dog friendly, AC rooms, Konkan food), where copy lives, photos policy |
| [admin.md](admin.md) | Admin dashboard: what's built, how to add a page or setting |
| [future-services.md](future-services.md) | **TODO**: third-party activities (parasailing, scuba, kayaking…) as configurable, operator-owned offers |
| [multi-tenancy.md](multi-tenancy.md) | **TODO (major)**: white-label SaaS, one platform for many domains and UI packs |
| [quality-gates.md](quality-gates.md) | **TODO, phased**: pre-push hooks, CI, integration and E2E tests |
| [testing/README.md](testing/README.md) | **Test strategy**: pyramid, smoke/sanity/regression suites, background integration runs, feature matrix report |
| [testing/manual-test-plan.md](testing/manual-test-plan.md) | **Manual test cases** for every built feature, with expected results and worked numbers (usable today) |
| [testing/feature-catalog.md](testing/feature-catalog.md) | Every feature with ID and status; basis of the test-results matrix |
| [guided-experience.md](guided-experience.md) | **TODO**: guest and admin walkthroughs, AI assistant with owner handoff |
| [saas-billing.md](saas-billing.md) | **TODO**: billing tenants (plans, usage, add-ons), tenant invoices, cost control |
| [channel-sync.md](channel-sync.md) | **Planned**: room types + OTA sync (iCal, then channel manager) |
| [notifications.md](notifications.md) | Events, WhatsApp / SMS / Telegram channels, routing, templates |
| [configuration.md](configuration.md) | Every env var and every `settings` key |
| [design-system.md](design-system.md) | Theme tokens, runtime overrides, component conventions |
| [api.md](api.md) | HTTP endpoints |
| [deployment.md](deployment.md) | Supabase + Vercel setup, cron, moving to another host |
| [development.md](development.md) | Local setup, scripts, tests, conventions, git workflow |
| [decisions.md](decisions.md) | Architecture decision log (why things are the way they are) |
| [roadmap.md](roadmap.md) | What's built, what's next |

**Keep these docs current**: any change to behaviour, schema, settings, env vars or endpoints updates the relevant doc in the same commit.
