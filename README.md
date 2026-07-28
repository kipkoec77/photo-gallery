# Photo Gallery

Photo Gallery is a Next.js app for photography businesses. It lets an admin upload event photos, automatically capture metadata, organize images into events and albums, and share galleries with clients through unguessable share tokens instead of client logins.

## Project Overview

The app is split into a few core flows:

- Admins create clients and events.
- Photos are uploaded to an event, EXIF metadata is extracted, and images are stored in Cloudinary.
- Albums generate share tokens that can be private, password-protected, and optionally time-limited.
- Clients view galleries through share-token links without signing in.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file from the example:

```bash
copy .env.example .env.local
```

3. Fill in the required values in `.env.local`:

- `MONGODB_URI`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

4. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Create The First Admin User

The app does not expose a public signup flow. Create or replace the single admin account with the setup script:

```bash
npx tsx scripts/create-admin.ts
```

The script prompts for the admin email and password, hashes the password with bcrypt, and writes the admin record to MongoDB.

## How The Flow Works

1. Create a client in the admin area.
2. Create an event and assign it to that client.
3. Upload photos for the event through the upload API.
4. Create an album for the event.
5. Share the generated gallery link with the client.
6. The gallery page validates the share token, enforces optional passwords and expiry, and loads the event photos.
7. Clients can optionally download the entire album as a zip file.

## Deploying To Vercel

1. Add all production environment variables in the Vercel dashboard.
2. Set `NEXTAUTH_URL` to the exact production domain, for example `https://photo-gallery.vercel.app`. This must match exactly or auth redirects and sessions can break.
3. Make sure `NEXTAUTH_SECRET` is set to a strong random value in production.
4. In MongoDB Atlas, allow network access from Vercel. The simplest option is to whitelist `0.0.0.0/0`, though you can tighten that later with more specific IP rules if your deployment setup allows it.
5. Confirm Cloudinary credentials are set in Vercel before deployment.

## Notes

- `.env.local` is ignored by git.
- `.env.example` is committed so new environments have a complete template.