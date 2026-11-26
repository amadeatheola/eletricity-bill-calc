# Household Watts

A working household electricity bill app built with React, Vinext, Cloudflare Workers, D1, and R2. Accounts use Sites' Sign in with ChatGPT. Bills and files are stored on the server, not in browser storage.

## Workflow

1. Sign in and register your name and international phone number.
2. Create a household with a name, number of people (including the leader), currency, billing-cycle day, password, and optional payment instructions.
3. Add every member's name and phone. Share individual WhatsApp invitations, then share the household password separately.
4. Members sign in, register with their invited phone number, and join using the household ID and password.
5. The leader creates one calculation per bill month. Dates default to the household cycle and can be overridden for that calculation. Existing periods cannot overlap.
6. Each participant chooses the entire period, selected calendar days, or away throughout. Pending responses are never treated as absences.
7. Once everyone responds, the app shows the split. The leader confirms and finalizes it. Attendance and amounts then lock.
8. Members upload a JPEG, PNG, or PDF payment receipt. The leader downloads it and confirms payment or requests a replacement with a note.

Any household member can view that household's calculations. Only the uploader and household leader can download a receipt. Other households cannot access these records. Joining later does not retroactively add someone to old calculations; add everyone before creating the bill.

## Billing rules

Dates are half-open: **start included, end excluded**. A period from 22 October to 22 November contains 31 days, ending on 21 November. Adjacent bills therefore do not double-count the 22nd.

Each calendar day receives `bill total / period days`. That day's cost is split equally among people who stayed that day. Each person's monthly share is the sum of their daily shares. This estimates usage by attendance; it does not measure personal electricity consumption.

If nobody is home on a day, its cost is shared equally among everyone who stayed at least once during the period. Members absent throughout pay zero. An all-absent calculation cannot be finalized; the household must resolve its attendance before allocating the bill.

The engine uses exact BigInt fractions. Final cents use largest-remainder allocation with participant-ID tie breaking, so shares always sum exactly to the bill. Displayed daily amounts may be rounded, but calculations are not.

Billing days 29–31 clamp to a short month's last day. Billing periods support 1–62 days; households support 1–50 people. Each calculation preserves its own currency and dates even if household defaults change later.

## WhatsApp

The buttons use [WhatsApp's click-to-chat links](https://faq.whatsapp.com/5913398998672934) with an international phone number and a prepared message. They open WhatsApp; the user chooses whether to send. The app does not send messages automatically, attach a receipt to a WhatsApp chat, or claim delivery.

After uploading, a member can open a prepared message to the leader with the amount and protected calculation link. The leader reviews the receipt in the app. Automatic outbound reminders or file forwarding would require a separately configured messaging integration and its credentials.

## Access and account assumptions

- Hosted identity comes from the Sites gateway; do not expose the Worker directly on a public URL that trusts arbitrary identity headers.
- This Site starts owner-private. Real housemates also need permission to visit the Site before app-level invitation links will work. The app itself enforces household membership independently of Site sharing.
- Household passwords are **hashed, not encrypted**, with a random per-household salt and PBKDF2-SHA256. Password hashes never leave the server. Leaders can rotate passwords in settings; rotation prevents new joins with the old password but does not revoke existing memberships.
- Joining requires a matching pre-created phone invitation and household password. Phone numbers are self-declared contact details, not SMS-verified proof of ownership. Share the household password only with intended members. Dedicated invitation tokens or phone verification would be needed for stronger individual invitation assurance.
- Join attempts are limited to ten per signed-in account per fifteen minutes. All writes require same-origin requests; every sensitive route checks identity and membership.
- Finalizing uses optimistic version checks, and receipt review rejects stale versions. Once finalized, attendance cannot be changed. Receipt files are private, limited to 5 MB, and checked for supported file signatures. They are downloaded as attachments.

## Local setup

Run all commands from the `electricity-bill-calc` repository root. The application, configuration, tests, and package files live directly here.

Use Node 22.13+ (Node 24 LTS recommended) and npm.

```sh
npm ci
npm run build
npm run db:local
npm run dev
```

Open the localhost URL printed by the dev server. The portable starter supplies a development-only ChatGPT sign-in simulation (`Seedy`). That identity is never included in the hosted production build. Local D1 and R2 state lives under ignored `.wrangler/`; production data is separate.

`npm run db:local` applies the initial schema. Run it once on a fresh local database. Existing local database and receipt state is preserved when relocating the project; do not reapply the initial schema after the move. Future schema changes should use `npm run db:generate` and apply only the new migration files, in order.

```sh
npm run typecheck
npm test
npm run build
```

The database schema is in `db/schema.ts`, the split engine in `lib/billing.ts`, and API authorization in `lib/server.ts` and `app/api/`. UI components are in `app/ui.tsx`.

## Integration checks

Run the built Worker locally with `npm start -- --port 8787`, then `npm run test:api` in another terminal. The integration script is hard-coded to localhost and supplies synthetic gateway identities. It checks account registration, household invitations, unauthorized access, date overlap, pending attendance, stale updates, finalization, file validation, receipt permissions, rejection, and payment confirmation.

The script writes fixture-specific cleanup statements to `outputs/qa/cleanup.sql`; apply them against the local D1 database after the run. Never run these tests against production. A browser QA script under `tests/browser.integration.mjs` uses an isolated Chrome context and a separately installed `playwright-core` in the ignored `outputs/qa` directory.

## Hosting

`.openai/hosting.json` declares the Sites project, D1 `DB` binding, and R2 `BUCKET` binding. Build output is a Cloudflare Worker in `dist/server/index.js`; the Sites workflow provisions storage and applies schema migrations during publication. Keep `.wrangler/`, `node_modules/`, credentials, and test output out of source control.
