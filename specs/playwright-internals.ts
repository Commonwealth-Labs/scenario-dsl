import { test, type Page, type TestDetails } from '@playwright/test';

// The only file that reaches into Playwright.
//
// Playwright labels a test with the line that called test(), and a step with
// the line that called test.step(), which from the DSL would always be dsl.ts:
// the report, the trace viewer, the editor's gutter and `playwright test
// file:line` would all point at the DSL. So dsl.ts asks here where a scenario
// or a step was written, and declares the test at that spot through the same
// internal call test() makes. Three internals of Playwright 1.63 are relied
// on: the symbol linking test to its implementation, that object's
// _createTest, and the bundled helper that maps a stack frame back to the
// TypeScript source. If any is missing after an upgrade, callerLocation
// returns nothing, declareTest falls back to test(), and every scenario and
// step is labelled with the DSL's own files again, which the list output makes
// obvious.

export type Location = { file: string; line: number; column: number };

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
export const callerLocation = (above: Function): Location | undefined => {
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

type Body = (context: { page: Page }) => Promise<void>;

// Declares a test at the given location; without the internals, at the line
// below that calls test(), which is the old behaviour.
export const declareTest = (type: 'default' | 'fixme', at: Location | undefined, title: string, details: TestDetails, body: Body) => {
  if (internals) internals.impl._createTest(type, at, title, details, body);
  else if (type === 'fixme') test.fixme(title, details, body);
  else test(title, details, body);
};
