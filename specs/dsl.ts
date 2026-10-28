import { test, expect, type Page } from '@playwright/test';
import { callerLocation, declareTest, type Location } from './playwright-internals';

// A spec file is a list of scenarios. Each line of a scenario is a step: a
// keyword and some text, written as a tagged template:
//
//   Scenario(`capturing an obligation takes only its name`,
//     Given`the map is empty`,
//     When`I capture "file the accounts" with nothing else`,
//     Then`"file the accounts" is on the map`,
//   );
//
// Quoted strings in the text are parameters, so 'I capture "file the accounts"'
// and 'I capture "fix the gutter"' share one implementation, keyed
// 'When I capture "…"'. Implementations are plain functions registered from
// specs/steps/*.ts by calling the step with a function:
//
//   Given`the map is empty`(async ({ page }) => { … });
//
// And continues the line before it, so Given … And … is two Givens. Its
// implementation is registered under Given, When or Then, never And.
//
// A scenario with a step that has no implementation yet, or no steps at all
// (a title alone), is reported as pending, not failed.
//
// A scenario and each of its steps are reported at their own lines in the spec
// file. playwright-internals.ts is how, and is the only file that reaches into
// Playwright to do it.

type Context = { page: Page };
type Implementation = (context: Context, ...args: string[]) => Promise<void>;
type Keyword = 'Given' | 'When' | 'Then';
type Step = { keyword: Keyword | 'And'; text: string; key: string; args: string[]; location?: Location };
type StepTag = Step & ((implementation: Implementation) => void);

const implementations = new Map<string, Implementation>();

const join = (strings: TemplateStringsArray, values: unknown[]) =>
  strings.reduce((text, part, i) => text + part + (i < values.length ? String(values[i]) : ''), '');

const parse = (text: string) => {
  const args: string[] = [];
  const key = text.replace(/"([^"]*)"/g, (_, value) => {
    args.push(value);
    return '"…"';
  });
  return { key, args };
};

const keyword = (word: Keyword | 'And') => {
  const tag = (strings: TemplateStringsArray, ...values: unknown[]): StepTag => {
    const text = join(strings, values);
    const { key, args } = parse(text);
    const fullKey = `${word} ${key}`;
    const register = (implementation: Implementation) => {
      implementations.set(fullKey, implementation);
    };
    return Object.assign(register, { keyword: word, text, key: fullKey, args, location: callerLocation(tag) });
  };
  return tag;
};

export const Given = keyword('Given');
export const When = keyword('When');
export const Then = keyword('Then');
// And continues the line before it: a Given, a When or a Then.
export const And = keyword('And');

const resolveAnds = (steps: Step[]) => {
  let previous: Keyword = 'Given';
  return steps.map((step) => {
    if (step.keyword !== 'And') {
      previous = step.keyword;
      return step;
    }
    return { ...step, keyword: previous, key: `${previous} ${step.key.slice('And '.length)}` };
  });
};

export const Scenario = (title: string, ...given: Step[]) => {
  const at = callerLocation(Scenario);
  const name = `Scenario: ${title}`;
  const steps = resolveAnds(given);
  const missing = steps.filter((step) => !implementations.has(step.key));
  if (steps.length === 0 || missing.length > 0) {
    const why = steps.length === 0 ? 'no steps yet' : `no implementation for:\n - ${missing.map((step) => step.key).join('\n - ')}`;
    declareTest('fixme', at, name, { annotation: { type: 'pending', description: why } }, async () => {});
    return;
  }
  declareTest('default', at, name, {}, async ({ page }) => {
    for (const step of steps) {
      await test.step(`${step.keyword} ${step.text}`, () =>
        implementations.get(step.key)!({ page }, ...step.args), { location: step.location });
    }
  });
};

export { expect };
