# Specs

A spec file is a list of scenarios. Each scenario is a title and some steps,
written as tagged templates:

```ts
import { Scenario, Given, When, Then } from './steps';

Scenario(`the service is up and shows its home page`,
  Given`the service is running`,
  When`I open the home page`,
  Then`I see "Example service"`,
);
```

That is the whole file. A spec file holds scenarios and nothing else: no
selectors, no logic, no imports but that one. Spec files are numbered,
`NNNN-slug.spec.ts`, one per slice of behaviour.

## Steps

A step's implementation is a plain function in `steps/`, registered by calling
the step with it:

```ts
import { Given, When, Then, expect } from './dsl';

When`I open the home page`(async ({ page }) => {
  await page.goto('/');
});

Then`I see "Example service"`(async ({ page }, text) => {
  await expect(page.getByRole('heading', { name: text })).toBeVisible();
});
```

- Steps are keyed by their text. Quoted strings in the text are parameters, so
  `` Then`I see "Example service"` `` and `` Then`I see "Sam"` `` share one
  implementation, which receives the quoted values as strings after `{ page }`.
- `And` continues the line before it: `Given … And …` is two Givens.
  Implementations are registered under Given, When or Then, never And.
- A step file must be imported from `steps/index.ts`, or nothing it registers
  is seen.

## Pending

A scenario with a step that has no implementation, or with no steps at all, is
reported as pending, not failed. The run stays green. With these two scenarios
in a new file, `0001-signing-in.spec.ts`:

```ts
Scenario(`a signed-in user sees their name`,
  Given`I am signed in as "Sam"`,
  When`I open the home page`,
  Then`I see "Sam"`,
);

Scenario(`a signed-out user is asked to sign in`);
```

the run prints:

```
  -  1 [desktop] › 0001-signing-in.spec.ts:3:9 › Scenario: a signed-in user sees their name
  -  2 [desktop] › 0001-signing-in.spec.ts:9:9 › Scenario: a signed-out user is asked to sign in
  -  3 [phone] › 0001-signing-in.spec.ts:3:9 › Scenario: a signed-in user sees their name
  -  4 [phone] › 0001-signing-in.spec.ts:9:9 › Scenario: a signed-out user is asked to sign in
  ✓  5 [phone] › 0000-walking-skeleton.spec.ts:3:9 › Scenario: the service is up and shows its home page (82ms)
  ✓  6 [desktop] › 0000-walking-skeleton.spec.ts:3:9 › Scenario: the service is up and shows its home page (82ms)

  4 skipped
  2 passed (458ms)
```

Only the Given is missing from the first one: `I open the home page` already
exists, and `` Then`I see "Sam"` `` reuses the implementation of
`` Then`I see "…"` ``. The HTML report carries a `pending` annotation on each
skipped scenario saying exactly that:

```
no implementation for: Given I am signed in as "…"
no steps yet
```

## The flow

After Kent Beck's Canon TDD: the whole list first, then one at a time.

1. List the slice's scenarios as titles only, `` Scenario(`…`) `` with no steps.
   They are pending.
2. Fill in each one's Given / When / Then in words, with no code behind them.
   Read the whole slice end to end to check it hangs together.
3. Take one scenario at a time. Implement its steps in `steps/`; it goes live.
   Run it. **It must fail.** If it passes, either the behaviour already exists
   or the test is wrong; say which. Then make the smallest change that makes it
   pass, and check no other scenario changed colour.

Every spec runs twice, once in the `desktop` project and once in `phone`.

## Layout

```
specs/
  dsl.ts                   the DSL, shared by every service
  playwright-internals.ts  the one file that reaches into Playwright; its comment says why
  package.json             the only one in the repo
  <service>/
    playwright.config.ts   starts the service; desktop and phone projects
    NNNN-slug.spec.ts      numbered spec files, scenarios only
    steps/
      dsl.ts               one line: re-exports ../../dsl
      index.ts             imports every step file, then re-exports the DSL
      *.ts                 step implementations
```

## Quirks

- A scenario is reported at the line of its `Scenario(` call and each step at
  its own line, but only because `playwright-internals.ts` reaches into three
  Playwright internals, pinned at 1.63. If an upgrade moves them, it falls back
  to plain `test()` and `test.step()`, and everything is labelled with the DSL's
  own files instead; the list output shows it at once.
- Registering the same step text twice replaces the first, silently.
- Parameters are always strings, and a quote inside one cannot be escaped.

## Where it came from

This folder was copied from https://github.com/Commonwealth-Labs/scenario-dsl.
`dsl.ts` and `playwright-internals.ts` are the same files there; keep them
identical and carry improvements across by hand.
