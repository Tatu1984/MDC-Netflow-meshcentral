import { test as setup } from '@playwright/test';
import { mockAuthState } from './mock-data';

/**
 * Auth setup — injects mock Zustand auth state into localStorage
 * so all authenticated tests run without real Microsoft login.
 */
setup('seed auth state', async ({ page }) => {
  await page.goto('/');

  // Inject the Zustand auth store into localStorage
  await page.evaluate((authState) => {
    localStorage.setItem('auth-storage', JSON.stringify(authState));
    localStorage.setItem('accessToken', 'mock-id-token-for-testing');
  }, mockAuthState);

  // Save the authenticated browser state to a file
  await page.context().storageState({ path: 'tests/.auth/user.json' });
});
