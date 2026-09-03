# Contributing

Thanks for helping make the Sales Tax Calculator API examples clearer and safer.

## Good contributions

- Fix an integration bug or outdated provider API usage.
- Make setup steps easier to follow on macOS, Linux, or Windows.
- Improve error handling, accessibility, security, or test coverage.
- Add a focused example for a widely used integration after discussing its maintenance cost.

Please do not add tax rates, tax rules, copied production responses, credentials, generated SDKs, or application-specific business data.

## Local checks

```bash
npm install
npm run check
python -m compileall -q python/quickstart
```

Run the example you changed with sandbox credentials. Never use live payment credentials in a pull request or issue.

## Pull requests

Keep each pull request focused. Explain the user problem, the behavior you changed, and how you verified it. Include screenshots only when the browser experience changed, and remove personal or payment information first.

