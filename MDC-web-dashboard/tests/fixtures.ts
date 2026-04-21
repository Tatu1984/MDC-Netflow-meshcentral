import { test as base, expect, type Page } from '@playwright/test';
import {
  mockWorkspaces,
  mockSites,
  mockOrganizations,
  mockRemoteNetworks,
  mockUsers,
  mockActivityLogs,
  mockTemplates,
  odataCollection,
} from './mock-data';

/**
 * Extended test fixture that intercepts all MDC API calls and returns mock data.
 * This lets tests run without a real backend.
 */
export const test = base.extend<{ mockApi: Page }>({
  mockApi: async ({ page }, use) => {
    // Intercept all API proxy calls to the MDC backend
    await page.route('**/api/proxy/**', async (route) => {
      const url = route.request().url();

      // ── Organizations ──────────────────────────────────────────────
      if (url.includes('/Organizations') && !url.match(/Organizations\('[^']+'\)/)) {
        return route.fulfill({ json: odataCollection(mockOrganizations) });
      }
      if (url.match(/Organizations\('org-001'\)/)) {
        return route.fulfill({ json: mockOrganizations[0] });
      }
      if (url.match(/Organizations\('org-002'\)/)) {
        return route.fulfill({ json: mockOrganizations[1] });
      }

      // ── Sites ──────────────────────────────────────────────────────
      if (url.includes('/Sites') && !url.match(/Sites\('[^']+'\)/)) {
        return route.fulfill({ json: odataCollection(mockSites) });
      }
      if (url.match(/Sites\('site-001'\)/)) {
        return route.fulfill({ json: mockSites[0] });
      }
      if (url.match(/Sites\('site-002'\)/)) {
        return route.fulfill({ json: mockSites[1] });
      }

      // ── Workspaces ─────────────────────────────────────────────────
      if (url.includes('/Workspaces') && !url.match(/Workspaces\('[^']+'\)/)) {
        return route.fulfill({ json: odataCollection(mockWorkspaces) });
      }
      if (url.match(/Workspaces\('ws-001'\)/)) {
        return route.fulfill({ json: mockWorkspaces[0] });
      }
      if (url.match(/Workspaces\('ws-002'\)/)) {
        return route.fulfill({ json: mockWorkspaces[1] });
      }

      // ── Remote Networks ────────────────────────────────────────────
      if (url.includes('/RemoteNetworks') && !url.match(/RemoteNetworks\('[^']+'\)/)) {
        return route.fulfill({ json: odataCollection(mockRemoteNetworks) });
      }
      if (url.match(/RemoteNetworks\('rn-001'\)/)) {
        return route.fulfill({ json: mockRemoteNetworks[0] });
      }

      // ── Users ──────────────────────────────────────────────────────
      if (url.includes('/Users') && !url.match(/Users\('[^']+'\)/)) {
        return route.fulfill({ json: odataCollection(mockUsers) });
      }
      if (url.match(/Users\('test-user-001'\)/)) {
        return route.fulfill({ json: mockUsers[0] });
      }
      if (url.match(/Users\('test-user-002'\)/)) {
        return route.fulfill({ json: mockUsers[1] });
      }
      if (url.match(/Users\('test-user-003'\)/)) {
        return route.fulfill({ json: mockUsers[2] });
      }

      // ── Activity Logs ──────────────────────────────────────────────
      if (url.includes('/ActivityLogs')) {
        return route.fulfill({ json: odataCollection(mockActivityLogs) });
      }

      // ── Templates ──────────────────────────────────────────────────
      if (url.includes('/DownloadableTemplates') || url.includes('/Templates')) {
        return route.fulfill({ json: odataCollection(mockTemplates) });
      }

      // ── Auth Test endpoints ────────────────────────────────────────
      if (url.includes('/AuthTest')) {
        return route.fulfill({ json: { message: 'OK', status: 200 } });
      }

      // ── Fallback: return empty collection ──────────────────────────
      return route.fulfill({ json: { value: [], '@odata.count': 0 } });
    });

    // Intercept /api/config endpoint
    await page.route('**/api/config', async (route) => {
      return route.fulfill({
        json: {
          mdcApiUrl: 'http://localhost:5000',
          mdcApiKey: 'test-api-key',
          entraClientId: '',
          entraTenantId: '',
          entraAuthority: '',
        },
      });
    });

    await use(page);
  },
});

export { expect };
