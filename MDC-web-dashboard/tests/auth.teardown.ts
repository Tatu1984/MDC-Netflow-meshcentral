import { test as teardown } from '@playwright/test';
import fs from 'fs';

teardown('clean up auth state', async () => {
  const authFile = 'tests/.auth/user.json';
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
  }
});
