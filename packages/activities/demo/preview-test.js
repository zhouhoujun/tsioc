/**
 * Real-browser verification for the workflow designer demo, served by the
 * framework's HTTP microservice (`demo/serve.ts`).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register demo/build-demo.ts
 *   node demo/preview-test.js
 *
 * Requires Playwright + a Chromium runtime. Writes demo/preview.png.
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const DEMO_DIR = __dirname;
const PACKAGE_DIR = path.resolve(DEMO_DIR, '..');

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
    while (Date.now() - started < 30000) {
        try {
            const response = await fetch(`${base}/api/workflows`);
            if (response.ok) {
                return;
            }
        } catch {
            // ts-node is still compiling / the HTTP microservice is binding.
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('workflow HTTP microservice did not start');
}

function startHttpDemo(port) {
    return spawn(
        process.execPath,
        [
            '-r', 'ts-node/register',
            '-r', 'tsconfig-paths/register',
            path.join(DEMO_DIR, 'serve.ts'),
            String(port)
        ],
        {
            cwd: PACKAGE_DIR,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe']
        }
    );
}

(async () => {
    if (!fs.existsSync(path.join(DEMO_DIR, 'main.js'))) {
        throw new Error('demo/main.js missing; run the demo build first');
    }
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const server = startHttpDemo(port);
    let serverOutput = '';
    server.stdout.on('data', chunk => { serverOutput += chunk.toString(); });
    server.stderr.on('data', chunk => { serverOutput += chunk.toString(); });

    try {
        await waitForServer(base);
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        const errors = [];
        page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
        page.on('pageerror', error => errors.push(error.message));

        await page.goto(`${base}/`, { waitUntil: 'networkidle' });
        await page.waitForSelector('.workflow-node', { timeout: 15000 });
        const before = await page.evaluate(() => {
            const edge = document.querySelector('.workflow-edge');
            const box = edge?.getBoundingClientRect();
            const paneOverflow = ['.workspace-layout-left', '.workspace-layout-center', '.workspace-layout-right', '.workspace-layout-bottom']
                .map(selector => getComputedStyle(document.querySelector(selector)).overflowY);
            return {
                nodes: document.querySelectorAll('.workflow-node').length,
                edges: document.querySelectorAll('.workflow-edge').length,
                palette: document.querySelectorAll('.workflow-palette-item').length,
                title: document.querySelector('.workflow-toolbar-title')?.textContent,
                status: document.querySelector('.workflow-toolbar-status')?.textContent,
                edgeVisible: !!box && (box.width > 0 || box.height > 0),
                edgeNamespace: edge?.namespaceURI,
                panesScrollable: paneOverflow.every(value => value === 'auto' || value === 'scroll')
            };
        });

        // Palette search filters registered components without changing the registry.
        const paletteSearch = page.locator('.workflow-palette-search-input');
        await paletteSearch.fill('http');
        await page.waitForTimeout(120);
        const paletteFiltered = await page.locator('.workflow-palette-item').count();
        await paletteSearch.fill('');
        await page.waitForTimeout(120);
        const paletteRestored = await page.locator('.workflow-palette-item').count();

        // Selection actions stay disabled until a node or connection is selected.
        const deleteButton = page.locator('.workflow-toolbar .workflow-btn-danger');
        const deleteDisabledBefore = await deleteButton.isDisabled();

        // Code field uses the open-source CodeMirror editor; property form validates.
        await page.locator('.workflow-palette-item[data-node-type="function"]').click();
        await page.waitForSelector('.workflow-node[data-node-id="function_1"]', { timeout: 5000 });
        await page.waitForSelector('.workflow-inspector .CodeMirror', { timeout: 5000 });
        const codeEditor = await page.locator('.workflow-inspector .CodeMirror').count() > 0;
        const codeText = await page.locator('.workflow-inspector .CodeMirror').textContent();
        const nameInput = page.locator('.workflow-inspector-name');
        await nameInput.fill('');
        await page.waitForTimeout(100);
        const formInvalid = await page.locator('.workflow-field-error').count() > 0;
        await nameInput.fill('Function Node');
        await page.waitForTimeout(100);
        const formValid = await page.evaluate(() =>
            window.workflowDesigner.designer.nodes.find(node => node.id === 'function_1')?.name === 'Function Node'
        );
        const deleteEnabledAfter = !(await deleteButton.isDisabled());

        // Editing in the CodeMirror editor must persist to the node config.
        await page.locator('.workflow-inspector .CodeMirror').click();
        await page.keyboard.press('Control+A');
        await page.keyboard.type('return 42;');
        await page.waitForTimeout(200);
        const codeApplied = await page.evaluate(() =>
            window.workflowDesigner.designer.nodes.find(node => node.id === 'function_1')?.config?.code === 'return 42;'
        );

        // Connect a new Log node by dragging from task_2 output to its input.
        await page.locator('.workflow-palette-item[data-node-type="log"]').click();
        await page.waitForSelector('.workflow-node[data-node-id="log_1"]', { timeout: 5000 });
        const outPort = await page.locator('.workflow-node[data-node-id="task_2"] .workflow-node-port-output[data-port-id="out"]').boundingBox();
        const inPort = await page.locator('.workflow-node[data-node-id="log_1"] .workflow-node-port-input[data-port-id="in"]').boundingBox();
        await page.mouse.move(outPort.x + outPort.width / 2, outPort.y + outPort.height / 2);
        await page.mouse.down();
        await page.mouse.move(outPort.x + 20, outPort.y + 20, { steps: 3 });
        await page.mouse.move(inPort.x + inPort.width / 2, inPort.y + inPort.height / 2, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(150);
        const connection = await page.evaluate(() => ({
            edges: document.querySelectorAll('.workflow-edge').length,
            connections: window.workflowDesigner.designer.connections.length
        }));

        // Click the widened hit path to select an edge.
        await page.locator('.workflow-edge-hit[data-edge-id="conn_3"]').click({ force: true });
        await page.waitForTimeout(100);
        const edgeSelected = await page.evaluate(() =>
            document.querySelector('.workflow-edge[data-edge-id="conn_3"]')?.getAttribute('class')?.includes('is-selected')
        );

        // Switching language must not discard the edited document.
        await page.locator('#lang-zh').click();
        await page.waitForTimeout(200);
        const localePreserved = await page.evaluate(() => ({
            count: window.workflowDesigner.designer.nodes.length,
            locale: window.workflowDesigner.locale,
            title: document.querySelector('.workflow-toolbar-title')?.textContent
        }));
        await page.locator('#lang-en').click();
        await page.waitForTimeout(200);

        // Panning away and pressing Fit brings every node back into view.
        const canvasBox = await page.locator('.workflow-canvas').boundingBox();
        await page.mouse.move(canvasBox.x + 60, canvasBox.y + canvasBox.height - 60);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 560, canvasBox.y + canvasBox.height - 260, { steps: 6 });
        await page.mouse.up();
        await page.locator('.workflow-toolbar .workflow-btn', { hasText: 'Fit' }).click();
        await page.waitForTimeout(150);
        const fitVisible = await page.evaluate(() => {
            const canvas = document.querySelector('.workflow-canvas').getBoundingClientRect();
            return [...document.querySelectorAll('.workflow-node')].every(node => {
                const box = node.getBoundingClientRect();
                return box.left >= canvas.left - 1 && box.right <= canvas.right + 1
                    && box.top >= canvas.top - 1 && box.bottom <= canvas.bottom + 1;
            });
        });

        // Drag the left splitter; ratio-based panes must resize.
        const leftBefore = await page.locator('.workspace-layout-left').evaluate(el => el.getBoundingClientRect().width);
        const splitter = await page.locator('.workspace-splitter-left').boundingBox();
        await page.mouse.move(splitter.x + 2, splitter.y + 100);
        await page.mouse.down();
        await page.mouse.move(splitter.x + 42, splitter.y + 100, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(120);
        const leftAfter = await page.locator('.workspace-layout-left').evaluate(el => el.getBoundingClientRect().width);
        const resized = leftAfter > leftBefore + 10;

        // Collapse and restore the left pane from the splitter toggle.
        await page.locator('.workspace-collapse-left').click();
        await page.waitForTimeout(120);
        const collapsed = await page.locator('.workspace-layout-left').evaluate(el => {
            const style = getComputedStyle(el);
            return el.hasAttribute('hidden') || style.display === 'none';
        });
        await page.locator('.workspace-collapse-left').click();
        await page.waitForTimeout(120);
        const restored = await page.locator('.workspace-layout-left').evaluate(el => {
            const style = getComputedStyle(el);
            return !el.hasAttribute('hidden') && style.display !== 'none';
        });


        // Persist through the framework HTTP service.
        await page.locator('.workflow-toolbar .workflow-btn', { hasText: 'Save' }).first().click();
        await page.waitForTimeout(300);
        const apiList = await (await fetch(`${base}/api/workflows`)).json();
        if (!Array.isArray(apiList) || apiList.length !== 1) {
            errors.push(`expected one workflow from /api/workflows, got ${JSON.stringify(apiList)}`);
        }

        await page.locator('.workflow-toolbar .workflow-btn-primary').first().click();
        await page.waitForSelector('.workflow-node[data-node-id="task_2"][data-status="success"]', { timeout: 15000 });
        await page.waitForSelector('.workflow-node[data-node-id="task_3"][data-status="skipped"]', { timeout: 15000 });

        await page.locator('.workflow-toolbar .workflow-btn', { hasText: 'Logs' }).first().click();
        await page.waitForSelector('.workflow-run-log-row', { timeout: 5000 });
        const logs = await page.locator('.workflow-run-log-row').count();

        const after = await page.evaluate(() => ({
            completed: document.querySelector('.workflow-toolbar-status')?.textContent,
            traversed: document.querySelectorAll('.workflow-edge[data-status="traversed"]').length,
            skippedEdges: document.querySelectorAll('.workflow-edge[data-status="skipped"]').length,
            history: document.querySelectorAll('.workflow-run-chip').length,
            statusbar: document.querySelector('.workflow-statusbar')?.textContent?.replace(/\s+/g, ' ').trim()
        }));

        // Verify the library list is backed by the HTTP service.
        await page.locator('.workflow-toolbar .workflow-btn', { hasText: 'Workflows' }).first().click();
        await page.waitForSelector('.workflow-library-row', { timeout: 5000 });
        const libraryRows = await page.locator('.workflow-library-row').count();

        // Theme switching (light -> dark).
        await page.locator('.workflow-toolbar .workflow-btn[title="Toggle theme"]').click();
        await page.waitForTimeout(120);
        const darkTheme = await page.evaluate(() => {
            const designer = document.querySelector('.workflow-designer');
            return {
                attribute: designer?.getAttribute('data-theme'),
                background: designer ? getComputedStyle(designer).backgroundColor : ''
            };
        });

        await page.screenshot({ path: path.join(DEMO_DIR, 'preview.png') });

        // The demo persists the chosen theme; a reload restores it.
        const themeStored = await page.evaluate(() => localStorage.getItem('workflow-demo-theme'));
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('.workflow-designer[data-theme="dark"]', { timeout: 15000 });
        const themeAfterReload = await page.evaluate(() =>
            document.querySelector('.workflow-designer')?.getAttribute('data-theme')
        );

        await browser.close();

        const result = { before, paletteFiltered, paletteRestored, deleteDisabledBefore, deleteEnabledAfter, localePreserved, fitVisible, codeEditor, codeText: String(codeText || '').trim().slice(0, 40), codeApplied, formInvalid, formValid, resized, collapsed, restored, connection, edgeSelected, darkTheme, themeStored, themeAfterReload, after, logs, libraryRows, apiWorkflows: apiList.length, errors };
        console.log(JSON.stringify(result, null, 2));
        if (errors.length || !before.edgeVisible || !before.panesScrollable
            || paletteFiltered < 1 || paletteFiltered >= 35 || paletteRestored !== 35
            || !deleteDisabledBefore || !deleteEnabledAfter || localePreserved.count !== 8 || localePreserved.locale !== 'zh-CN' || !fitVisible
            || !codeEditor || !codeApplied || !formInvalid || !formValid || !resized || !collapsed || !restored
            || connection.connections !== 7 || !edgeSelected || darkTheme.attribute !== 'dark'
            || themeStored !== 'dark' || themeAfterReload !== 'dark') {
            process.exitCode = 1;
        }
    } catch (error) {
        console.error(error);
        if (serverOutput) {
            console.error(serverOutput);
        }
        process.exitCode = 1;
    } finally {
        server.kill('SIGTERM');
    }
})();
