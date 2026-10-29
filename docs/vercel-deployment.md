# Vercel deployment

Deploy from the repository root using Vercel Services. The root `vercel.json` builds `frontend/` as Next.js and `backend/` as FastAPI. `/api/v1/*`, `/simulation/*`, and `/health` route directly to Python; all other requests route to Next.js. Keep the Vercel project root at the repository root.

## Configuration

- Use a current Vercel CLI with Services support, then `vercel login` and `vercel --prod`.
- Set `NEXT_PUBLIC_API_URL=/api/v1` (also the default). Do not set `API_PROXY_URL` to localhost on Vercel; public service routing replaces the local Next.js proxy.
- Set `ENVIRONMENT=production` and a private `IMAGE_LAB_SIGNING_KEY` containing a random 32-byte Ed25519 seed encoded as 64 hex characters. Configure the same seed for every instance in an environment. Never commit it or put it in a `NEXT_PUBLIC_` variable.
- Python is pinned to 3.12. The deployment excludes virtual environments, local credentials, dependencies, tests, local databases, and development build output using `.vercelignore`.

## Demo storage limits

The current repository uses SQLite and a single-process experiment worker. On Vercel the writable fallback is `/tmp/qds/qds.sqlite3`. This data is **temporary and specific to an instance**, not durable shared cloud storage. A run created on one instance may be unavailable on another. Multi-step research workflows and saved study history therefore require a shared database and coordinated job execution for reliable multi-instance production use. Image/text lab receipts contain their own channel evidence and do not require saved run lookup; their signatures remain stable only when the configured signing seed is stable.

When serverless execution is enabled, repeated-trial studies execute within the create request, rather than leaving a background thread to be frozen after the response. Large studies remain subject to the deployment's function duration limits. The local server retains its asynchronous queue behavior. Request cancellation during a synchronous cloud study is not guaranteed across instances.

The existing WebSocket telemetry endpoints require separate hosting/runtime support; the core image/text labs and six-step research requests use HTTP.

## Verification

After deployment, check `/health`, `/api/v1/image-lab/capabilities`, the image and text guided demos, and the material/signing workflow. Confirm capability `persistent_key` is true. Download evidence while runs are available. A successful frontend deployment alone does not confirm the Python API is operational.
