# scenario-dsl

Specs written as scenarios: Given / When / Then lines on Playwright's runner, with
the step implementations kept apart from the spec files, and every scenario
pending until each of its steps has an implementation. Every spec runs at a
desktop and a phone viewport.

The DSL is one file, `specs/dsl.ts`, with no dependency but `@playwright/test`.
The pattern itself, with the rules and the flow for writing specs, is in
`specs/README.md`; that file travels with the folder.

This repo is laid out like a repo that has already adopted it: the services
under `apps/`, their specs under `specs/` with one folder per service, and Node
only inside `specs/`. Make yours look like this one.

## Adding it to a repo

1. Copy `specs/` to the root of your repo and install once, inside it:

       cd specs && npm install

   `specs/` is the only place with a `package.json`. The shared file and every
   service's steps resolve the same copy of Playwright from it, and nothing
   Node-related touches the root.

2. For each service, copy `specs/example/` to `specs/<service>/` and change two
   things:

   - in `playwright.config.ts`, the `port` and the `webServer.command` that
     starts the service. The command runs from `specs/<service>/`, so
     `../../apps/<service>` reaches it.
   - in `0000-walking-skeleton.spec.ts`, the quoted text in the Then, so it names
     something the service's home page shows.

   Then remove `specs/example/`. Nothing else refers to it.

3. Run it from inside the service's folder:

       cd specs/<service> && npx playwright test

   or from `specs/`:

       npx playwright test -c <service>

   The first run on a machine needs the browser: `npx playwright install chromium`.

The walking skeleton is the first spec every service gets, and it stays. From
there, follow the flow in `specs/README.md`: titles first, then words, then one
scenario at a time.

## Running the example here

    cd specs
    npm ci
    npx playwright install chromium
    npm test

## Where it came from

The DSL was first written for Worry Map, where it is `specs/steps/dsl.ts`. The
two copies are kept identical by hand; `diff` them when one changes.
