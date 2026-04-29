# Fabric Price Book Deployment

This app is set up for the same free-style deployment as the production schedule app:

- Hosting: Vercel
- Data storage: Supabase

## Supabase

The app uses the existing Supabase project:

```text
https://fftdjnjnvusgrbbfbwcw.supabase.co
```

Data is stored in `public.app_state` with this row id:

```text
fabric_price_book
```

If needed, run `supabase-setup.sql` in the Supabase SQL Editor.

## Vercel

Import this GitHub repository in Vercel and deploy it as a static site.

No Render paid disk is needed.
