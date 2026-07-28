# Project: Photo Gallery for Photography Business

## Purpose
A web app where a photographer uploads event photos, which are automatically 
sorted by date and location (from EXIF metadata), and shared with clients via 
private tokenized links or shared albums.

## Stack
- Next.js 14 (App Router, TypeScript)
- MongoDB with Mongoose
- Cloudinary for image storage/CDN (next-cloudinary for frontend rendering)
- exifr for EXIF extraction (date + GPS)
- Nominatim (OpenStreetMap) for reverse geocoding
- Tailwind CSS

## Data model
- **events**: title, date, locationName, clientId
- **photos**: eventId, cloudinaryPublicId, takenAt, gps {lat, lng}, locationName
- **clients**: name, email
- **albums**: eventId, shareToken (unique, unguessable), isPrivate, expiresAt

Access to client galleries is via shareToken in the URL — no forced login.

## Mandatory working style — do not skip steps

For every phase of work, follow this exact sequence, in order:

1. **Explain the phase** — plain-language summary of what we're building 
   and how it fits the overall app, before writing any code.
2. **Write complete code** — full file contents only. No partial diffs, no 
   "// rest stays the same" placeholders.
3. **Explain every file** — for each file touched: what it does, why it's 
   structured that way, how it connects to other files.
4. **Run lint and build** — execute `npm run lint` then `npm run build`. 
   Fix any errors or warnings before proceeding. Do not silence errors with 
   `eslint-disable` or `@ts-ignore` without explicitly flagging it to me and 
   explaining why no real fix exists.
5. **Suggest improvements** — flag edge cases, security concerns (e.g. 
   unauthenticated routes, unvalidated input, exposed secrets), or 
   performance issues worth addressing later, even if out of scope now.
6. **Stop and wait for my approval** before starting the next phase.

## Code standards
- Strict TypeScript (`strict: true`), no `any` without a justifying comment
- Async/await only — no unhandled promise rejections
- API routes always return proper HTTP status codes + structured JSON errors
- Secrets only via `.env.local`, never hardcoded, never logged
- Index MongoDB fields used in queries (e.g. `eventId`, `takenAt`, `shareToken`)