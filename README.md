# Promptathon Backend

Two Vercel Functions proxy the Gemini API without exposing the server-side API key:

- `POST /classify` classifies a batch of merchant strings.
- `POST /letter` generates a short future-self letter.

## Deploy

1. Import this repository into Vercel.
2. In the Vercel project settings, add the environment variable `GEMINI_API_KEY` with your Google Gemini API key.
3. Deploy. The functions are available at `/classify` and `/letter`.

The key is read only by the server-side functions and is never logged or returned. Both endpoints allow CORS from any origin and handle `OPTIONS` preflight requests.

## Local development

Install the Vercel CLI, set `GEMINI_API_KEY` in your local environment, and run:

```bash
vercel dev
```