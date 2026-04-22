import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import puppeteer from 'puppeteer';

const HOST = '127.0.0.1';
const START_PORT = 4173;

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, HOST);
  });
}

async function findAvailablePort(startPort = START_PORT, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = startPort + attempt;
    const available = await isPortAvailable(candidate);
    if (available) {
      return candidate;
    }
  }

  throw new Error(`No available port found from ${startPort} to ${startPort + maxAttempts - 1}`);
}

function startServer(port) {
  const server = spawn(
    getNpmCommand(),
    ['run', 'dev', '--', '--host', HOST, '--port', String(port), '--strictPort'],
    {
      shell: false,
      stdio: 'inherit',
      env: { ...process.env },
    },
  );

  const shutdown = () => {
    if (!server.killed) {
      server.kill();
    }
  };

  process.on('exit', shutdown);
  process.on('SIGINT', () => {
    shutdown();
    process.exit(130);
  });

  return server;
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // keep waiting
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function createPage(browser) {
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(10000);
  return page;
}

async function setJsonRoutes(page, routes) {
  await page.setRequestInterception(true);

  const handler = async (request) => {
    for (const route of routes) {
      if (request.url().includes(route.pattern)) {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(route.payload),
        });
        return;
      }
    }

    await request.continue();
  };

  page.on('request', handler);

  return () => {
    page.off('request', handler);
  };
}

async function setText(page, selector, value) {
  await page.evaluate(
    ({ selector, value }) => {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Missing element: ${selector}`);
      }

      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { selector, value },
  );
}

async function waitForText(page, text) {
  await page.waitForFunction((expectedText) => document.body.innerText.includes(expectedText), {}, text);
}

async function runLoginTest(browser) {
  const baseUrl = globalThis.__E2E_BASE_URL__;
  const page = await createPage(browser);

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-testid="login-form"]');

  const removeRoutes = await setJsonRoutes(page, [
    {
      pattern: '/api/v1/auth/signin',
      payload: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          display_name: 'Test User',
        },
        access_token: 'fake-jwt-token',
      },
    },
    {
      pattern: '/api/v1/phones',
      payload: {
        data: {
          phones: [],
          meta: {
            page: 1,
            page_size: 20,
            total_items: 0,
            total_pages: 1,
          },
        },
      },
    },
  ]);

  await setText(page, '[data-testid="login-email"]', 'test@example.com');
  await setText(page, '[data-testid="login-password"]', 'Password123!');
  await page.click('[data-testid="login-submit"]');

  await page.waitForFunction(() => window.location.pathname === '/phones');
  await waitForText(page, 'Phone List');
  await waitForText(page, 'No phones found');

  const token = await page.evaluate(() => localStorage.getItem('token'));
  assert.equal(token, 'fake-jwt-token');

  removeRoutes();

  await page.close();
}

async function runSignupTest(browser) {
  const baseUrl = globalThis.__E2E_BASE_URL__;
  const page = await createPage(browser);

  await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-testid="signup-form"]');

  await page.click('[data-testid="signup-submit"]');
  await waitForText(page, 'Display name is required');
  await waitForText(page, 'Email is required');
  await waitForText(page, 'Password is required');

  await setText(page, '[data-testid="signup-display-name"]', 'Test User');
  await setText(page, '[data-testid="signup-email"]', 'test@example.com');
  await setText(page, '[data-testid="signup-password"]', 'weak');
  await setText(page, '[data-testid="signup-confirm-password"]', 'weak');
  await page.click('[data-testid="signup-submit"]');
  await waitForText(page, 'Password must contain');

  const removeRoutes = await setJsonRoutes(page, [
    {
      pattern: '/api/v1/auth/signup',
      payload: {
        user: {
          id: 'user-2',
          email: 'new@example.com',
          display_name: 'New User',
        },
        access_token: 'signup-token',
      },
    },
    {
      pattern: '/api/v1/phones',
      payload: {
        data: {
          phones: [],
          meta: {
            page: 1,
            page_size: 20,
            total_items: 0,
            total_pages: 1,
          },
        },
      },
    },
  ]);

  await setText(page, '[data-testid="signup-password"]', 'Password123!');
  await setText(page, '[data-testid="signup-confirm-password"]', 'Password123!');
  await page.click('[data-testid="signup-submit"]');

  await page.waitForFunction(() => window.location.pathname === '/phones');
  await waitForText(page, 'Phone List');

  const token = await page.evaluate(() => localStorage.getItem('token'));
  assert.equal(token, 'signup-token');

  removeRoutes();

  await page.close();
}

async function main() {
  const port = await findAvailablePort();
  const baseUrl = `http://${HOST}:${port}`;
  globalThis.__E2E_BASE_URL__ = baseUrl;

  const server = startServer(port);
  await waitForServer(baseUrl);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    await runLoginTest(browser);
    await runSignupTest(browser);
    console.log('Puppeteer auth tests passed');
  } finally {
    await browser.close();
    if (!server.killed) {
      server.kill();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});