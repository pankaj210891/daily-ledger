# @daily-ledger/data

Shared TanStack Query defaults, cache keys, query hooks, and invalidation helpers for the Daily Ledger web and mobile apps.

## Install

```sh
npm install @daily-ledger/data @tanstack/react-query react
```

Wrap the app in a `QueryClientProvider` using `createLedgerQueryClient()`. Build the app's query hooks from its own platform-specific API client with `createLedgerQueries(api)`.
