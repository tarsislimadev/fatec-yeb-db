import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import puppeteer from 'puppeteer';

const HOST = '127.0.0.1';
const START_PORT = 4173;

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

async function startServer(port) {
  const { createServer } = await import('vite');
  const server = await createServer({
    server: {
      host: HOST,
      port,
      strictPort: true,
    },
    logLevel: 'error',
  });

  await server.listen();
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

async function runLoginTest(browser) {
  const baseUrl = globalThis.__E2E_BASE_URL__;
  const page = await createPage(browser);

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-testid="login-form"]');
  await page.waitForSelector('[data-testid="login-email"]');
  await page.waitForSelector('[data-testid="login-password"]');
  await page.waitForSelector('[data-testid="login-submit"]');

  const loginSubtitle = await page.$eval('p', (el) => el.textContent || '');
  if (!loginSubtitle.includes('Sign in to your account')) {
    throw new Error('Login subtitle text was not rendered as expected');
  }

  await page.click('a[href="/signup"]');
  await page.waitForFunction(() => window.location.pathname === '/signup');

  await page.close();
}

async function runSignupTest(browser) {
  const baseUrl = globalThis.__E2E_BASE_URL__;
  const page = await createPage(browser);

  await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-testid="signup-form"]');
  await page.waitForSelector('[data-testid="signup-display-name"]');
  await page.waitForSelector('[data-testid="signup-email"]');
  await page.waitForSelector('[data-testid="signup-password"]');
  await page.waitForSelector('[data-testid="signup-confirm-password"]');
  await page.waitForSelector('[data-testid="signup-submit"]');

  const passwordHint = await page.$eval('p.text-xs.text-gray-600.mb-4', (el) => el.textContent || '');
  if (!passwordHint.includes('Password must contain')) {
    throw new Error('Signup password hint was not rendered as expected');
  }

  await page.click('a[href="/login"]');
  await page.waitForFunction(() => window.location.pathname === '/login');

  await page.close();
}

async function main() {
  const port = await findAvailablePort();
  const baseUrl = `http://${HOST}:${port}`;
  globalThis.__E2E_BASE_URL__ = baseUrl;

  const server = await startServer(port);
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
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});