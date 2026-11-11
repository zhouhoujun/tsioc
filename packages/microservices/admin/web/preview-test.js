/**
 * Real-browser verification for the visual microservice admin console.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register build-web.ts
 *   node web/preview-test.js
 *
 * Requires Playwright + Chromium.
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const WEB_DIR = __dirname;
const PACKAGE_DIR = path.resolve(WEB_DIR, '..');

function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = address && typeof address === 'object' ? address.port : 0;
            server.close(() => resolve(port));
        });
    });
}

async function waitForServer(base) {
    const started = Date.now();
    while (Date.now() - started < 60000) {
        try {
            const response = await fetch(`${base}/api/gateway-admin/state`);
            if (response.ok) {
                return;
            }
        } catch {
            // ts-node is still compiling / the HTTP microservice is binding.
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('gateway admin HTTP microservice did not start');
}

(async () => {
    if (!fs.existsSync(path.join(WEB_DIR, 'main.js'))) {
        throw new Error('web/main.js missing; run `npm run build:web` first');
    }
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const server = spawn(
        process.execPath,
        ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', path.join(WEB_DIR, 'serve.ts'), String(port)],
        { cwd: PACKAGE_DIR, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let output = '';
    server.stdout.on('data', chunk => { output += chunk.toString(); });
    server.stderr.on('data', chunk => { output += chunk.toString(); });

    try {
        await waitForServer(base);
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        const errors = [];
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('pageerror', error => errors.push(error.message));

        await page.goto(`${base}/admin/index.html`, { waitUntil: 'networkidle' });
        await page.waitForSelector('.ga-shell', { timeout: 15000 });
        await page.waitForSelector('.workflow-node', { timeout: 15000 });

        const initial = await page.evaluate(() => ({
            routes: document.querySelectorAll('.ga-route-card').length,
            nodes: document.querySelectorAll('.workflow-node').length,
            gatewayPalette: document.querySelectorAll('.workflow-palette-item[data-node-type^="gateway-"]').length,
            status: document.querySelector('.ga-status')?.textContent || ''
        }));
        if (initial.routes < 1) throw new Error('expected the seeded demo route');
        if (initial.nodes < 2) throw new Error('expected the starter rule workflow to render');
        if (initial.gatewayPalette < 3) throw new Error('expected gateway route/condition/deny palette entries');

        await page.locator('.ga-routes .ga-actions .ga-btn').first().click();
        await page.waitForTimeout(80);
        await page.locator('.ga-routes .ga-actions .ga-btn-primary').click();
        await page.waitForFunction(() =>
            (document.querySelector('.ga-status')?.textContent || '').includes('Routes applied'),
            undefined, { timeout: 5000 });
        const routeState = await page.evaluate(async () => {
            const response = await fetch('/api/gateway-admin/state');
            return response.json();
        });
        if (routeState.routes.length !== 2) {
            throw new Error(`expected 2 routes after apply, got ${routeState.routes.length}`);
        }

        await page.locator('.ga-rules .ga-actions .ga-btn-primary').click();
        await page.waitForFunction(() =>
            (document.querySelector('.ga-status')?.textContent || '').includes('Rules applied'),
            undefined, { timeout: 5000 });
        const ruleState = await page.evaluate(async () => {
            const response = await fetch('/api/gateway-admin/state');
            return response.json();
        });
        if (ruleState.rules.length !== 2) {
            throw new Error(`expected 2 compiled rules, got ${ruleState.rules.length}`);
        }
        if (errors.length) {
            throw new Error(`browser errors: ${errors.join(' | ')}`);
        }

        console.log(JSON.stringify({
            ok: true,
            routes: routeState.routes.length,
            rules: ruleState.rules.length,
            nodes: initial.nodes,
            gatewayPalette: initial.gatewayPalette
        }));
        await browser.close();
    } finally {
        server.kill('SIGTERM');
        if (server.exitCode === null && output && process.env.DEBUG_PREVIEW) {
            console.error(output);
        }
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
