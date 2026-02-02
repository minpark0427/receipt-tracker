# Receipt Budget Tracker - Work Plan

## Context

### Original Request
Build a website for overseas business trip expense management:
- Take photos of receipts and run OCR
- Organize data: Date, Time, Location/Business Name, Cost
- Real-time budget management with $1,280 USD total
- Shareable link for team collaboration
- Dashboard showing spent vs remaining budget
- Easy copy-paste for company system upload

### Interview Summary
**Key Discussions**:
- **Access method**: Simple shared link (no authentication required)
- **Currency**: USD ($1,280 total budget)
- **Trip duration**: 1-2 weeks
- **Testing**: Basic tests after implementation
- **Tech stack**: Next.js + Supabase + Tabscanner + Vercel (recommended)

**Research Findings**:
- Tabscanner free tier: 200 scans/month, 99.99% accuracy, extracts merchant/date/total
- Tabscanner ONLY supports JPG/PNG (NOT HEIC) - conversion required
- Supabase real-time: PostgreSQL changes broadcast to all clients instantly
- HTML5 `<input type="file" accept="image/*" capture="environment">` works on iOS Safari + Android Chrome
- Vercel free tier sufficient for this project

### Metis Review
**Identified Gaps** (addressed):
- HEIC conversion: iPhone photos must be converted to JPG before Tabscanner
- Currency handling: Store original currency, display as-is (no conversion)
- OCR failure UX: Allow manual editing, show confidence badges
- Scan limit: Display remaining scans prominently (200/month)
- Data export: Add CSV export for expense reporting

---

## Work Objectives

### Core Objective
Build a mobile-first collaborative receipt tracker that enables team members to photograph receipts, automatically extract data via OCR, and track expenses against a shared $1,280 budget in real-time.

### Concrete Deliverables
- Next.js web application deployed on Vercel
- Supabase PostgreSQL database with real-time subscriptions
- Receipt upload with camera capture (mobile-optimized)
- Tabscanner OCR integration with manual edit fallback
- Dashboard showing budget spent/remaining
- Shareable link system (UUID-based, no auth)
- CSV export for expense reporting

### Definition of Done
- [ ] Upload receipt photo → see extracted data within 15 seconds
- [ ] Dashboard shows: total spent, remaining budget, receipt list by date
- [ ] User A uploads → User B sees it within 3 seconds (no refresh)
- [ ] Copy shareable link → paste in new browser → see same dashboard
- [ ] Can edit any receipt's date/time/location/cost manually
- [ ] Works on iPhone Safari and Android Chrome without horizontal scroll
- [ ] Shows scan counter "X of 200 scans used this month"

### Must Have
- Receipt photo capture (rear camera)
- OCR extraction via Tabscanner API
- Manual edit capability for OCR results
- Real-time dashboard with budget tracking
- Shareable link generation
- Receipt list sorted by date/time
- Remaining budget display with progress bar
- CSV export functionality

### Must NOT Have (Guardrails)
- NO user authentication (just UUID-based trip links)
- NO expense categories (only Date/Time/Location/Cost)
- NO multi-trip support (single trip only)
- NO charts or analytics beyond progress bar
- NO push notifications or email alerts
- NO automatic currency conversion
- NO receipt line item display (totals only)
- NO Tabscanner API key exposed to client-side code
- NO sequential/guessable IDs for trip URLs
- NO HEIC uploads to Tabscanner (must convert to JPG)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (empty project)
- **User wants tests**: YES (basic tests after implementation)
- **Framework**: bun test (Bun's built-in test runner)

### Manual Execution Verification

Each task includes verification procedures using:
- **Playwright browser automation**: For UI interactions
- **curl**: For API endpoint testing
- **Bun REPL**: For utility function verification

---

## Task Flow

```
Phase 1: Foundation
Task 0 (Setup) → Task 1 (Database) → Task 2 (Basic Upload)

Phase 2: Core Features  
Task 3 (OCR Integration) → Task 4 (Manual Edit) → Task 5 (Real-time)

Phase 3: Collaboration
Task 6 (Shareable Links) → Task 7 (Dashboard) → Task 8 (Budget Display)

Phase 4: Polish
Task 9 (Mobile Camera) → Task 10 (HEIC Conversion) → Task 11 (CSV Export)

Phase 5: Testing & Deploy
Task 12 (Tests) → Task 13 (Deploy)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 4, 5 | Manual edit + real-time are independent after OCR |
| B | 9, 10 | Camera + HEIC conversion are independent |

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | 0 | Database needs project setup |
| 2 | 1 | Upload needs database |
| 3 | 2 | OCR needs upload flow |
| 6 | 5 | Shareable links need real-time |
| 7 | 6 | Dashboard needs link system |
| 12 | 11 | Tests need all features |
| 13 | 12 | Deploy needs tests |

---

## TODOs

### Phase 1: Foundation

- [ ] 0. Project Setup & Configuration

  **What to do**:
  - Initialize Next.js 16 project with App Router, TypeScript, Tailwind CSS
  - Configure Bun as package manager
  - Set up Supabase project (free tier)
  - Add environment variables (.env.local)
  - Initialize git repository

  **Must NOT do**:
  - Do NOT add authentication libraries
  - Do NOT add unnecessary dependencies

  **Parallelizable**: NO (first task)

  **References**:
  
  **External References**:
  - Official docs: `https://nextjs.org/docs/app` - Next.js App Router setup
  - Official docs: `https://supabase.com/docs/guides/getting-started/quickstarts/nextjs` - Supabase + Next.js quickstart
  - Bun docs: `https://bun.sh/docs/cli/create` - Project creation with Bun

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Command: `bun run dev` → Server starts at http://localhost:3000
  - [ ] Command: `curl http://localhost:3000` → Returns HTML
  - [ ] File exists: `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] File exists: `package.json` with `next`, `@supabase/supabase-js` dependencies

  **Commit**: YES
  - Message: `feat(init): setup Next.js 16 with Supabase integration`
  - Files: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `.env.local.example`, `app/`, `lib/supabase.ts`

---

- [ ] 1. Database Schema & Supabase Configuration

  **What to do**:
  - Create `trips` table: `id (uuid)`, `created_at`, `budget (numeric)`, `currency (text)`
  - Create `receipts` table: `id (uuid)`, `trip_id (fk)`, `image_url`, `date`, `time`, `location`, `cost`, `original_currency`, `ocr_confidence`, `created_at`
  - Enable Row Level Security with trip_id-based policies
  - Enable Realtime replication on `receipts` table
  - Create Supabase Storage bucket `receipt-images` (private)

  **Must NOT do**:
  - Do NOT add user_id columns (no auth)
  - Do NOT create indexes beyond primary keys initially

  **Parallelizable**: NO (depends on Task 0)

  **References**:
  
  **External References**:
  - Official docs: `https://supabase.com/docs/guides/database/tables` - Table creation
  - Official docs: `https://supabase.com/docs/guides/realtime/postgres-changes` - Realtime setup
  - Official docs: `https://supabase.com/docs/guides/storage` - Storage bucket setup

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Supabase Dashboard: Tables `trips` and `receipts` visible
  - [ ] Supabase Dashboard: Realtime enabled on `receipts` table
  - [ ] Supabase Dashboard: Storage bucket `receipt-images` exists
  - [ ] SQL test: `INSERT INTO trips (budget, currency) VALUES (1280, 'USD') RETURNING id;` → Returns UUID

  **Commit**: YES
  - Message: `feat(db): add trips and receipts tables with RLS and realtime`
  - Files: `supabase/migrations/*.sql` (or document SQL in README)

---

- [ ] 2. Basic Receipt Upload Flow

  **What to do**:
  - Create `/api/upload` route for handling image uploads
  - Upload image to Supabase Storage with path `{trip_id}/{timestamp}-{filename}.jpg`
  - Generate signed URL for image access (7 days expiry)
  - Create receipt record in database (without OCR data initially)
  - Build basic upload form component with file input

  **Must NOT do**:
  - Do NOT integrate OCR yet (Task 3)
  - Do NOT add camera capture yet (Task 9)

  **Parallelizable**: NO (depends on Task 1)

  **References**:
  
  **External References**:
  - Official docs: `https://supabase.com/docs/guides/storage/uploads` - File uploads
  - Official docs: `https://supabase.com/docs/reference/javascript/storage-from-upload` - JS SDK upload
  - Official docs: `https://supabase.com/docs/reference/javascript/storage-from-createsignedurl` - Signed URLs

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Using Playwright:
    - Navigate to `http://localhost:3000`
    - Upload test image via file input
    - Verify: "Upload successful" message appears
  - [ ] Supabase Dashboard: Image visible in `receipt-images` bucket
  - [ ] Database: New row in `receipts` table with `image_url` populated

  **Commit**: YES
  - Message: `feat(upload): basic receipt image upload to Supabase Storage`
  - Files: `app/api/upload/route.ts`, `components/UploadForm.tsx`

---

### Phase 2: Core Features

- [ ] 3. Tabscanner OCR Integration

  **What to do**:
  - Create `/api/ocr` route for Tabscanner API calls (keep API key server-side!)
  - Implement Tabscanner flow: POST /process → poll /result/{token} every 1s
  - Extract fields: `establishment`, `date`, `total`, `currency`
  - Map confidence scores to receipt record
  - Update receipt record with OCR data
  - Handle error cases (401 = rate limit, failed OCR)

  **Must NOT do**:
  - Do NOT expose Tabscanner API key to client
  - Do NOT skip polling (async processing takes ~5s)
  - Do NOT parse line items (totals only)

  **Parallelizable**: NO (depends on Task 2)

  **References**:
  
  **External References**:
  - Official docs: `https://docs.tabscanner.com/` - Tabscanner API reference
  - API endpoint: `POST https://api.tabscanner.com/api/2/process`
  - API endpoint: `GET https://api.tabscanner.com/api/result/{token}`

  **WHY Each Reference Matters**:
  - Tabscanner uses async processing: submit → wait ~5s → poll result
  - Confidence scores (0-1) indicate OCR accuracy
  - 401 error means rate limit exceeded (200/month free)

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] API test:
    ```bash
    curl -X POST http://localhost:3000/api/ocr \
      -H "Content-Type: application/json" \
      -d '{"imageUrl": "https://example.com/receipt.jpg"}'
    ```
    → Returns `{ establishment, date, total, confidence }`
  - [ ] Using Playwright:
    - Upload real receipt image
    - Wait up to 15 seconds
    - Verify: Location, date, cost fields auto-populated

  **Commit**: YES
  - Message: `feat(ocr): integrate Tabscanner API for receipt data extraction`
  - Files: `app/api/ocr/route.ts`, `lib/tabscanner.ts`

---

- [ ] 4. Manual Edit Capability

  **What to do**:
  - Create receipt detail modal/page with editable fields
  - Fields: date (date picker), time (time picker), location (text), cost (number)
  - Show OCR confidence badge (green >0.8, yellow 0.5-0.8, red <0.5)
  - Save changes to database via `/api/receipts/[id]` PATCH route
  - Optimistic UI updates

  **Must NOT do**:
  - Do NOT add expense categories
  - Do NOT add receipt deletion yet (future enhancement)

  **Parallelizable**: YES (with Task 5 after Task 3)

  **References**:
  
  **External References**:
  - React Hook Form: `https://react-hook-form.com/` - Form handling
  - date-fns: `https://date-fns.org/` - Date formatting

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Using Playwright:
    - Click on a receipt in the list
    - Edit location from "Store A" to "Store B"
    - Click Save
    - Verify: List shows "Store B"
    - Refresh page → Still shows "Store B"

  **Commit**: YES
  - Message: `feat(edit): add manual editing for receipt data with confidence badges`
  - Files: `components/ReceiptDetail.tsx`, `app/api/receipts/[id]/route.ts`

---

- [ ] 5. Real-time Updates

  **What to do**:
  - Set up Supabase Realtime subscription on `receipts` table
  - Filter by `trip_id` to only receive relevant updates
  - Update local state when INSERT/UPDATE/DELETE events received
  - Show visual indicator when data is syncing

  **Must NOT do**:
  - Do NOT use websockets directly (use Supabase Realtime)
  - Do NOT poll the database

  **Parallelizable**: YES (with Task 4 after Task 3)

  **References**:
  
  **External References**:
  - Official docs: `https://supabase.com/docs/guides/realtime/subscribing-to-database-changes` - Realtime subscriptions
  - Pattern: `supabase.channel('receipts').on('postgres_changes', { event: '*', schema: 'public', table: 'receipts', filter: 'trip_id=eq.{id}' }, callback)`

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Open app in Browser A and Browser B (same trip link)
  - [ ] In Browser A: Upload a receipt
  - [ ] In Browser B: Receipt appears within 3 seconds without refresh
  - [ ] DevTools Network tab: WebSocket connection active

  **Commit**: YES
  - Message: `feat(realtime): add Supabase realtime subscriptions for instant sync`
  - Files: `hooks/useRealtimeReceipts.ts`, `lib/supabase.ts`

---

### Phase 3: Collaboration

- [ ] 6. Shareable Link System

  **What to do**:
  - On first visit (no trip_id), create new trip with UUID, redirect to `/{trip_id}`
  - Store trip_id in URL path (not query param)
  - Validate trip_id format (UUID) on every request
  - Add "Copy Link" button with clipboard API
  - Add QR code generation for easy mobile sharing

  **Must NOT do**:
  - Do NOT use sequential/guessable IDs
  - Do NOT require login to access link

  **Parallelizable**: NO (depends on Task 5)

  **References**:
  
  **External References**:
  - Next.js dynamic routes: `https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes`
  - QR code: `https://www.npmjs.com/package/qrcode.react` - QR generation

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Visit `http://localhost:3000` → Redirects to `http://localhost:3000/{uuid}`
  - [ ] Copy URL, open in incognito → Same dashboard loads
  - [ ] Click "Copy Link" button → URL copied to clipboard
  - [ ] QR code visible and scannable

  **Commit**: YES
  - Message: `feat(share): add UUID-based shareable links with QR code`
  - Files: `app/[tripId]/page.tsx`, `components/ShareButton.tsx`, `middleware.ts`

---

- [ ] 7. Dashboard Layout

  **What to do**:
  - Create main dashboard with three sections:
    1. Budget summary (top): Spent / Total with progress bar
    2. Quick upload (middle): Camera button + upload button
    3. Receipt list (bottom): Sorted by date, newest first
  - Receipt list item shows: Date, Location, Cost
  - Tap receipt → opens edit modal
  - Mobile-first responsive design (works without horizontal scroll)

  **Must NOT do**:
  - Do NOT add charts or analytics
  - Do NOT add filtering/search yet

  **Parallelizable**: NO (depends on Task 6)

  **References**:
  
  **External References**:
  - Tailwind CSS: `https://tailwindcss.com/docs` - Responsive utilities

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Using Playwright (mobile viewport 375x667):
    - Navigate to trip URL
    - Verify: No horizontal scrollbar
    - Verify: Budget summary visible at top
    - Verify: Receipt list scrollable vertically
  - [ ] Desktop viewport (1280x720):
    - Layout adjusts appropriately

  **Commit**: YES
  - Message: `feat(dashboard): mobile-first dashboard with budget summary and receipt list`
  - Files: `app/[tripId]/page.tsx`, `components/Dashboard.tsx`, `components/ReceiptList.tsx`

---

- [ ] 8. Budget Display & Alerts

  **What to do**:
  - Calculate total spent from all receipts in trip
  - Display: "$X spent of $1,280" with progress bar
  - Color coding: Green (<80%), Yellow (80-99%), Red (>=100%)
  - Show remaining: "$Y remaining"
  - Handle budget exceeded gracefully (negative remaining in red)

  **Must NOT do**:
  - Do NOT add push notifications
  - Do NOT add email alerts

  **Parallelizable**: NO (depends on Task 7)

  **References**:
  
  **Pattern References**:
  - Progress bar: Tailwind's `w-[X%]` for dynamic width

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Add receipts totaling $500 → Progress bar at ~39%, green
  - [ ] Add receipts totaling $1,100 → Progress bar at ~86%, yellow
  - [ ] Add receipts totaling $1,400 → Progress bar full, red, shows "-$120 remaining"

  **Commit**: YES
  - Message: `feat(budget): add budget progress bar with color-coded alerts`
  - Files: `components/BudgetSummary.tsx`

---

### Phase 4: Polish

- [ ] 9. Mobile Camera Integration

  **What to do**:
  - Add camera capture button using HTML5 `<input type="file" accept="image/*" capture="environment">`
  - Show image preview before upload
  - Add loading state during upload/OCR
  - Handle permission denied gracefully

  **Must NOT do**:
  - Do NOT use getUserMedia (simpler capture attribute is sufficient)
  - Do NOT add video recording

  **Parallelizable**: YES (with Task 10)

  **References**:
  
  **External References**:
  - MDN: `https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture` - Capture attribute
  - Pattern: `<input type="file" accept="image/*" capture="environment" />`

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] On iPhone Safari: Tap camera button → Opens camera (not file picker)
  - [ ] On Android Chrome: Tap camera button → Opens camera
  - [ ] Take photo → Preview shown → Confirm → Upload starts

  **Commit**: YES
  - Message: `feat(camera): add mobile camera capture with preview`
  - Files: `components/CameraCapture.tsx`

---

- [ ] 10. HEIC to JPG Conversion

  **What to do**:
  - Detect HEIC images (iPhone default)
  - Convert HEIC to JPG client-side before upload
  - Use `heic2any` or `browser-image-compression` library
  - Compress images to ~2MB max (Tabscanner limit)
  - Show conversion progress indicator

  **Must NOT do**:
  - Do NOT upload HEIC to Tabscanner (will fail!)
  - Do NOT skip compression (large files slow)

  **Parallelizable**: YES (with Task 9)

  **References**:
  
  **External References**:
  - npm: `https://www.npmjs.com/package/heic2any` - HEIC conversion
  - npm: `https://www.npmjs.com/package/browser-image-compression` - Image compression

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Upload HEIC image from iPhone → Converts to JPG automatically
  - [ ] DevTools Network: Uploaded file is `.jpg`, not `.heic`
  - [ ] Large 10MB image → Compressed to <2MB before upload

  **Commit**: YES
  - Message: `feat(image): add HEIC conversion and image compression`
  - Files: `lib/imageUtils.ts`, `components/UploadForm.tsx`

---

- [ ] 11. CSV Export

  **What to do**:
  - Add "Export CSV" button to dashboard
  - Generate CSV with columns: Date, Time, Location, Cost
  - Sort by date ascending
  - Download file as `expenses-{trip_id}.csv`
  - Format suitable for company expense system

  **Must NOT do**:
  - Do NOT add Excel export (CSV sufficient)
  - Do NOT add PDF export

  **Parallelizable**: NO (depends on Task 8)

  **References**:
  
  **External References**:
  - Pattern: `Blob` + `URL.createObjectURL` for client-side download

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Click "Export CSV" → File downloads
  - [ ] Open in Excel/Numbers → Columns: Date, Time, Location, Cost
  - [ ] Data matches dashboard display

  **Commit**: YES
  - Message: `feat(export): add CSV export for expense reporting`
  - Files: `lib/exportCsv.ts`, `components/ExportButton.tsx`

---

### Phase 5: Testing & Deploy

- [ ] 12. Basic Test Suite

  **What to do**:
  - Set up Bun test runner
  - Write tests for:
    - `lib/imageUtils.ts`: HEIC detection, compression
    - `lib/exportCsv.ts`: CSV generation
    - `lib/tabscanner.ts`: Response parsing
  - Add GitHub Actions workflow for CI

  **Must NOT do**:
  - Do NOT write E2E tests (manual verification sufficient)
  - Do NOT aim for 100% coverage

  **Parallelizable**: NO (depends on Task 11)

  **References**:
  
  **External References**:
  - Bun test: `https://bun.sh/docs/cli/test` - Test runner docs

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Command: `bun test` → All tests pass
  - [ ] GitHub: Push triggers CI, tests pass

  **Commit**: YES
  - Message: `test: add unit tests for utility functions`
  - Files: `lib/*.test.ts`, `.github/workflows/test.yml`

---

- [ ] 13. Vercel Deployment

  **What to do**:
  - Connect GitHub repo to Vercel
  - Add environment variables in Vercel dashboard:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `TABSCANNER_API_KEY`
  - Deploy to production
  - Test on real mobile devices
  - Update Supabase CORS/allowed origins

  **Must NOT do**:
  - Do NOT use custom domain (Vercel subdomain sufficient)

  **Parallelizable**: NO (final task)

  **References**:
  
  **External References**:
  - Vercel docs: `https://vercel.com/docs/deployments/git` - Git integration
  - Vercel docs: `https://vercel.com/docs/projects/environment-variables` - Env vars

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Visit `https://your-app.vercel.app` → App loads
  - [ ] On iPhone: Take photo → OCR works → Data saved
  - [ ] Share link to another device → Real-time sync works
  - [ ] Vercel dashboard: No build errors

  **Commit**: YES
  - Message: `chore: configure Vercel deployment`
  - Files: `vercel.json` (if needed)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 0 | `feat(init): setup Next.js 16 with Supabase integration` | package.json, etc. | `bun run dev` |
| 1 | `feat(db): add trips and receipts tables with RLS and realtime` | migrations | Supabase dashboard |
| 2 | `feat(upload): basic receipt image upload to Supabase Storage` | api/upload, components | Upload test |
| 3 | `feat(ocr): integrate Tabscanner API for receipt data extraction` | api/ocr, lib | OCR test |
| 4 | `feat(edit): add manual editing for receipt data with confidence badges` | components | Edit test |
| 5 | `feat(realtime): add Supabase realtime subscriptions for instant sync` | hooks | Two browser test |
| 6 | `feat(share): add UUID-based shareable links with QR code` | app/[tripId] | Link test |
| 7 | `feat(dashboard): mobile-first dashboard with budget summary and receipt list` | components | Mobile viewport test |
| 8 | `feat(budget): add budget progress bar with color-coded alerts` | components | Color threshold test |
| 9 | `feat(camera): add mobile camera capture with preview` | components | Mobile camera test |
| 10 | `feat(image): add HEIC conversion and image compression` | lib | HEIC upload test |
| 11 | `feat(export): add CSV export for expense reporting` | lib, components | Download test |
| 12 | `test: add unit tests for utility functions` | *.test.ts | `bun test` |
| 13 | `chore: configure Vercel deployment` | vercel.json | Production test |

---

## Success Criteria

### Verification Commands
```bash
# Local development
bun run dev        # Expected: Server at http://localhost:3000

# Tests
bun test           # Expected: All tests pass

# Type check
bun run typecheck  # Expected: No errors

# Build
bun run build      # Expected: Build succeeds
```

### Final Checklist
- [ ] All "Must Have" features present
- [ ] All "Must NOT Have" constraints respected
- [ ] Works on iPhone Safari
- [ ] Works on Android Chrome
- [ ] Real-time sync between multiple users
- [ ] Budget tracking accurate
- [ ] CSV export generates valid file
- [ ] Deployed to Vercel and accessible
