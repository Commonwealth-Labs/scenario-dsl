import { test as base, type Page } from '@playwright/test';

// What every step receives. To give steps more than the page, add fixtures
// with test.extend and include them here.
export type Context = { page: Page };

export const test = base.extend<{ stepContext: Context }>({
  stepContext: async ({ page }, use) => {
    await use({ page });
  },
});
