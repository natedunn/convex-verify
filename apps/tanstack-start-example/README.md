# TanStack Start Example

Minimal TanStack Start app for verifying that `convex-verify` works as a package dependency.

This app imports `convex-verify` by package name:

```ts
import { verifyConfig } from "convex-verify";
```

No relative imports, no secondary repo checkout.

## Versions

- `@tanstack/react-start`: `1.167.16` (`latest` npm tag)
- `@tanstack/react-router`: `1.168.10` (`latest` npm tag)
- `convex`: `1.34.1` (`latest` npm tag)

## What it tests

- `createExtension` lowercases and trims email addresses
- `uniqueColumnConfig` prevents duplicates after normalization
- `defaultValuesConfig` fills `status` and `createdAt`

The `convex-verify` setup for the example lives in `convex/verify.ts`, so the
mutation file stays focused on the app-facing handlers.

## Setup

1. Install dependencies from the repo root:

```bash
pnpm install
```

2. Start Convex once from this app and copy the deployment URL it prints:

```bash
pnpm --filter @convex-verify/tanstack-start-example convex:dev
```

3. Add the URL to `apps/tanstack-start-example/.env.local`:

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

4. In another terminal, run the app:

```bash
pnpm --filter @convex-verify/tanstack-start-example dev
```

That `dev` command starts both the TanStack Start Vite dev server and
`convex dev` together. The web server runs through Portless by default, so it
prints a `.localhost` URL instead of making you chase a port number.

If you need the raw Vite server for debugging, use:

```bash
pnpm --filter @convex-verify/tanstack-start-example dev:direct
```

## Notes

- Current TanStack Start stable requires Node `>=22.12.0`.
- This app is private and is not part of npm publishing for `convex-verify`.
- The checked-in `convex/_generated/*.ts` files are minimal stubs so the app can
  build before you configure Convex. A real `convex:dev` run will replace them
  with generated files for your deployment.
