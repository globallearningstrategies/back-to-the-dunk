# Working in this repo

- **Ship to main.** When the owner asks for a change, finish it, run `npm run lint`, `npm test -- --runInBand` and `npm run build`, then get it onto `main` without waiting to be asked (standing instruction from the owner, 2026-11-12). Vercel deploys `main` to production. If the checks fail, fix them first rather than shipping.
