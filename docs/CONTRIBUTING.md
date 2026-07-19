# Contributing

Thank you for contributing to Litigious.

## License

By contributing, you agree that your contributions will be licensed under the [GNU Affero General Public License v3.0](../LICENSE).

## Development setup

1. Fork and clone the repo
2. `npm run setup`
3. Configure `backend/.env`
4. `npm run db:push && npm run dev`
5. Run tests: `npm run test:backend`

## Pull requests

- Keep changes focused — one feature or fix per PR
- Match existing code style and patterns
- Update docs when behavior or env vars change
- Do not commit `.env`, credentials, or production URLs with secrets

## Reporting issues

Include: OS, Node version, steps to reproduce, expected vs actual behavior, relevant logs (redact secrets).
