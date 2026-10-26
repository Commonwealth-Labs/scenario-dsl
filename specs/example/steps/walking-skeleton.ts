import { Given, When, Then, expect } from './dsl';

Given`the service is running`(async ({ page }) => {
  const response = await page.request.get('/');
  expect(response.ok()).toBe(true);
});

When`I open the home page`(async ({ page }) => {
  await page.goto('/');
});

Then`I see "Example service"`(async ({ page }, text) => {
  await expect(page.getByRole('heading', { name: text })).toBeVisible();
});
