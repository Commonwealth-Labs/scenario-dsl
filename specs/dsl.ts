import { test, expect, type Page, type TestDetails } from '@playwright/test';

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

type Context = { page: Page };
type Implementation = (context: Context, ...args: string[]) => Promise<void>;
type Keyword = 'Given' | 'When' | 'Then';
type Location = { file: string; line: number; column: number };
type Step = { keyword: Keyword | 'And'; text: string; key: string; args: string[]; location?: Location };
type StepTag = Step & ((implementation: Implementation) => void);

const implementations = new Map<string, Implementation>();

// Playwright labels a test with the line that called test(), and a step with
// the line that called test.step(), which from here would always be this file:
// the report, the trace viewer, the editor's gutter and `playwright test
// file:line` would all point at the DSL. So a scenario is declared through the
// same internal call test() makes, with the location of the line in the spec
// file that called Scenario, and each step is given the location of its own
// line in the spec file. Three internals of Playwright 1.63 are relied on: the
// symbol linking test to its implementation, that object's _createTest, and
// the bundled helper that maps a stack frame back to the TypeScript source. If
// any is missing after an upgrade, scenarios fall back to test() and steps to
// test.step() without a location, and everything is labelled with this file
// again, which the list output makes obvious.

// The specs carry no Node typings, so V8's stack API and require are typed here.
type CallSite = { getFileName(): string | undefined; getLineNumber(): number | null; getColumnNumber(): number | null };
type V8 = { prepareStackTrace?: (error: Error, frames: CallSite[]) => unknown; stackTraceLimit: number; captureStackTrace(target: object, above?: Function): void };
declare const require: (id: string) => any;

const internals = (() => {
  try {
    const impl = Object.getOwnPropertySymbols(test)
      .map((symbol) => (test as any)[symbol])
      .find((value) => typeof value?._createTest === 'function');
    const wrapCallSite: ((site: CallSite) => CallSite) | undefined =
      require('playwright-core/lib/utilsBundle').sourceMapSupport?.wrapCallSite;
    if (impl && typeof wrapCallSite === 'function') return { impl, wrapCallSite };
  } catch {
    // one of the internals is gone
  }
  return undefined;
})();

// Where the given function was called from, mapped back to the TypeScript source.
const callerLocation = (above: Function): Location | undefined => {
  if (!internals) return undefined;
  const v8 = Error as unknown as V8;
  const { prepareStackTrace, stackTraceLimit } = v8;
  v8.prepareStackTrace = (_, frames) => frames;
  v8.stackTraceLimit = 1;
  const holder: { stack?: CallSite[] } = {};
  v8.captureStackTrace(holder, above);
  const raw = holder.stack?.[0]; // read before restoring: the stack is built on first read
  v8.prepareStackTrace = prepareStackTrace;
  v8.stackTraceLimit = stackTraceLimit;
  if (!raw) return undefined;
  const frame = internals.wrapCallSite(raw);
  const fileName = frame.getFileName() ?? '';
  const file = fileName.startsWith('file://') ? decodeURIComponent(new URL(fileName).pathname) : fileName;
  return { file, line: frame.getLineNumber() ?? 0, column: frame.getColumnNumber() ?? 0 };
};

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

type Body = (context: Context) => Promise<void>;

const declare = (type: 'default' | 'fixme', title: string, details: TestDetails, body: Body) => {
  if (internals) internals.impl._createTest(type, callerLocation(Scenario), title, details, body);
  else if (type === 'fixme') test.fixme(title, details, body);
  else test(title, details, body);
};

export const Scenario = (title: string, ...given: Step[]) => {
  const name = `Scenario: ${title}`;
  const steps = resolveAnds(given);
  const missing = steps.filter((step) => !implementations.has(step.key));
  if (steps.length === 0 || missing.length > 0) {
    const why = steps.length === 0 ? 'no steps yet' : `no implementation for: ${missing.map((step) => step.key).join('; ')}`;
    declare('fixme', name, { annotation: { type: 'pending', description: why } }, async () => {});
    return;
  }
  declare('default', name, {}, async ({ page }) => {
    for (const step of steps) {
      await test.step(`${step.keyword} ${step.text}`, () =>
        implementations.get(step.key)!({ page }, ...step.args), { location: step.location });
    }
  });
};

export { expect };
