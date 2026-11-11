/**
 * Real-browser verification for the product workflow designer, served by the
 * framework's HTTP microservice (`designer/serve.ts`).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register designer/build.ts
 *   node designer/preview-test.js
 *
 * Requires Playwright + a Chromium runtime. Writes designer/preview.png.
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const DESIGNER_DIR = __dirname;
const PACKAGE_DIR = path.resolve(DESIGNER_DIR, '..');

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

function startDesignerServer(port) {
    return spawn(
        process.execPath,
        [
            '-r', 'ts-node/register',
            '-r', 'tsconfig-paths/register',
            path.join(DESIGNER_DIR, 'serve.ts'),
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
    if (!fs.existsSync(path.join(DESIGNER_DIR, 'main.js'))) {
        throw new Error('designer/main.js missing; run the designer build first');
    }
    const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-workflow-preview-'));
    const previousDb = process.env.WORKFLOW_DB_FILE;
    process.env.WORKFLOW_DB_FILE = path.join(dbDir, 'workflows.db');
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const server = startDesignerServer(port);
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
            const port = document.querySelector('.workflow-node-port');
            const portHitSize = port ? parseFloat(getComputedStyle(port).width) : 0;
            const paneOverflow = ['.workspace-layout-left', '.workspace-layout-center', '.workspace-layout-right', '.workspace-layout-bottom']
                .map(selector => getComputedStyle(document.querySelector(selector)).overflowY);
            return {
                portHitSize,
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
        const initialJsBytes = await page.evaluate(() => performance.getEntriesByType('resource')
            .filter(entry => /\.js($|\?)/.test(entry.name))
            .reduce((sum, entry) => sum + (entry.encodedBodySize || entry.transferSize || 0), 0));
        const initialJsUrls = await page.evaluate(() => performance.getEntriesByType('resource')
            .filter(entry => /\.js($|\?)/.test(entry.name))
            .map(entry => entry.name));

        // The Node-RED style application menu opens, lists grouped commands and
        // closes again (Escape or an outside click are the shared menu behavior).
        const menuTrigger = page.locator('.workflow-toolbar .menu-bar-trigger');
        await menuTrigger.click();
        const menuOpen = await page.locator('.workflow-toolbar .menu-bar-popup').isVisible();
        const menuEntries = await page.locator('.workflow-toolbar .menu-bar-item').count();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(80);
        const menuClosed = !(await page.locator('.workflow-toolbar .menu-bar-popup').isVisible());

        await page.keyboard.press('Shift+Slash');
        await page.waitForSelector('.workflow-shortcuts-panel', { timeout: 3000 });
        const shortcutsOpened = await page.locator('.workflow-shortcuts-panel').count() > 0;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        const shortcutsClosed = await page.locator('.workflow-shortcuts-panel').count() === 0;

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
        const lazyEditorChunk = await page.evaluate(loaded => performance.getEntriesByType('resource')
            .some(entry => /\.js($|\?)/.test(entry.name) && !loaded.includes(entry.name)), initialJsUrls);
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

        // Workflow-aware completion: context/variables and configured actions.
        await page.locator('.workflow-inspector .CodeMirror').click();
        await page.keyboard.press('Control+A');
        await page.keyboard.type('context.');
        await page.waitForTimeout(600);
        const envHints = await page.locator('.CodeMirror-hint').allTextContents();
        const hintEnv = envHints.includes('actions') || envHints.includes('variables');
        await page.keyboard.press('Escape');
        await page.keyboard.press('Control+A');
        await page.keyboard.type('context.actions.');
        await page.keyboard.press('Control+Space');
        await page.waitForTimeout(400);
        const actionHints = await page.locator('.CodeMirror-hint').allTextContents();
        const hintAction = actionHints.includes('loadInput');
        await page.keyboard.press('Escape');

        // Editing in the CodeMirror editor must persist to the node config.
        await page.keyboard.press('Control+A');
        await page.keyboard.type('return 42;');
        // Code edits are debounced; wait past the quiet period (and then some).
        await page.waitForTimeout(400);
        const codeApplied = await page.evaluate(() =>
            window.workflowDesigner.designer.nodes.find(node => node.id === 'function_1')?.config?.code === 'return 42;'
        );

        // Autosave persists edits through the real HTTP store.
        await page.waitForTimeout(1200);
        const autosaved = await (await fetch(`${base}/api/workflows/workflow_demo`)).json();
        const autosaveName = autosaved?.nodes?.find(node => node.id === 'function_1')?.name;
        const autosaveCode = autosaved?.nodes?.find(node => node.id === 'function_1')?.config?.code;
        const autosaveState = (await page.locator('.workflow-save-state').textContent() || '').trim();

        // Property form: conditional fields, grouped sections, placeholders and reset.
        await page.locator('.workflow-node[data-node-id="condition_1"]').click();
        await page.waitForTimeout(150);
        const optionCount = await page.locator('.workflow-field[data-field-key="operator"] .workflow-option').count();
        const compareHidden = await page.locator('.workflow-field[data-field-key="value"]').count() === 0;
        await page.locator('.workflow-field[data-field-key="operator"] [data-option-value="equals"]').click();
        await page.waitForTimeout(150);
        const compareVisible = await page.locator('.workflow-field[data-field-key="value"]').count() > 0;
        await page.locator('.workflow-field[data-field-key="operator"] [data-option-value="truthy"]').click();
        await page.waitForTimeout(150);
        const compareHiddenAgain = await page.locator('.workflow-field[data-field-key="value"]').count() === 0;

        await page.locator('.workflow-node[data-node-id="task_1"]').click();
        await page.waitForTimeout(150);
        const actionPlaceholder = await page.locator('.workflow-field[data-field-key="action"] input').getAttribute('placeholder');
        const groupTitles = await page.locator('.workflow-field-group-title').allTextContents();
        const retry = page.locator('.workflow-field[data-field-key="retry"] input');
        await retry.fill('5');
        await page.waitForTimeout(150);
        const retrySet = await page.evaluate(() =>
            window.workflowDesigner.designer.nodes.find(node => node.id === 'task_1')?.config?.retry === 5
        );
        await page.locator('.workflow-field[data-field-key="retry"] .workflow-field-reset').click();
        await page.waitForTimeout(150);
        const retryReset = await page.evaluate(() =>
            window.workflowDesigner.designer.nodes.find(node => node.id === 'task_1')?.config?.retry === 0
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

        // Ctrl+wheel zooms around the cursor; a plain wheel pans the canvas.
        const zoomBefore = await page.evaluate(() => window.workflowDesigner.designer.zoom);
        const canvasCenter = await page.locator('.workflow-canvas').boundingBox();
        await page.mouse.move(canvasCenter.x + canvasCenter.width / 2, canvasCenter.y + canvasCenter.height / 2);
        await page.keyboard.down('Control');
        await page.mouse.wheel(0, -120);
        await page.keyboard.up('Control');
        await page.waitForTimeout(120);
        const zoomAfter = await page.evaluate(() => window.workflowDesigner.designer.zoom);
        const wheelZoom = zoomAfter > zoomBefore;
        const panBefore = await page.evaluate(() => window.workflowDesigner.designer.pan.y);
        await page.mouse.wheel(0, 120);
        await page.waitForTimeout(120);
        const panAfter = await page.evaluate(() => window.workflowDesigner.designer.pan.y);
        const wheelPan = panAfter !== panBefore;

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

        // Theme submenu lists every built-in theme and applies it to the layout.
        await page.locator('.workflow-toolbar .menu-bar-trigger').click();
        await page.locator('[data-menu-id="theme"]').hover();
        await page.waitForTimeout(120);
        const themeMenuItems = await page.locator('.menu-bar-submenu [data-menu-id^="theme:"]').count();
        await page.locator('[data-menu-id="theme:solarized"]').click();
        await page.waitForTimeout(220);
        const solarizedTheme = await page.evaluate(() => {
            const designer = document.querySelector('.workflow-designer');
            const splitter = document.querySelector('.workspace-splitter');
            const collapse = document.querySelector('.workspace-collapse');
            return {
                attribute: designer?.getAttribute('data-theme'),
                splitter: splitter ? getComputedStyle(splitter).backgroundColor : '',
                collapse: collapse ? getComputedStyle(collapse).backgroundColor : ''
            };
        });
        await page.locator('.workflow-toolbar .menu-bar-trigger').click();
        await page.locator('[data-menu-id="theme"]').hover();
        await page.waitForTimeout(120);
        const checkedTheme = ((await page.locator('.menu-bar-submenu [data-menu-id^="theme:"].is-checked').textContent()) || '').trim();
        await page.locator('[data-menu-id="theme:light"]').click();
        await page.waitForTimeout(220);
        const lightThemeRestored = await page.evaluate(() =>
            document.querySelector('.workflow-designer')?.getAttribute('data-theme')
        );

        // Theme switching is exposed only through the menu submenu.
        const inlineThemeToggle = await page.locator('.workflow-toolbar [title="Toggle theme"]').count();
        await page.locator('.workflow-toolbar .menu-bar-trigger').click();
        await page.locator('[data-menu-id="theme"]').hover();
        await page.waitForTimeout(120);
        await page.locator('[data-menu-id="theme:dark"]').click();
        await page.waitForTimeout(120);
        const darkTheme = await page.evaluate(() => {
            const designer = document.querySelector('.workflow-designer');
            return {
                attribute: designer?.getAttribute('data-theme'),
                background: designer ? getComputedStyle(designer).backgroundColor : ''
            };
        });
        const layoutTheme = await page.evaluate(() => {
            const designer = document.querySelector('.workflow-designer');
            const left = document.querySelector('workspace-left');
            const canvas = document.querySelector('.workflow-canvas');
            let lightBorders = 0;
            for (const element of [designer, ...(designer ? designer.querySelectorAll('*') : [])]) {
                if (!element) continue;
                const style = getComputedStyle(element);
                for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
                    const width = parseFloat(style[`border${side}Width`] || '0');
                    const match = (style[`border${side}Color`] || '').match(/rgb\((\d+), (\d+), (\d+)\)/);
                    if (width > 0 && match && +match[1] > 190 && +match[2] > 190 && +match[3] > 190) {
                        lightBorders++;
                    }
                }
            }
            return {
                scrollbar: designer ? getComputedStyle(designer).scrollbarColor : '',
                leftScrollbar: left ? getComputedStyle(left).scrollbarColor : '',
                canvasScrollbar: canvas ? getComputedStyle(canvas).scrollbarColor : '',
                lightBorders
            };
        });

        // Show the dynamic-form inspector in the final screenshot (dark theme).
        await page.locator('.workflow-node[data-node-id="condition_1"]').click();
        await page.waitForTimeout(150);
        await page.locator('.workflow-field[data-field-key="operator"] [data-option-value="equals"]').click();
        await page.waitForTimeout(200);
        const inspectorRendered = await page.locator('workflow-inspector dynamic-form').count() > 0;
        await page.waitForTimeout(900);
        await page.screenshot({ path: path.join(DESIGNER_DIR, 'preview.png') });

        // The demo persists the chosen theme; a reload restores it.
        const themeStored = await page.evaluate(() => localStorage.getItem('workflow-designer-theme'));
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('.workflow-designer[data-theme="dark"]', { timeout: 15000 });
        const themeAfterReload = await page.evaluate(() =>
            document.querySelector('.workflow-designer')?.getAttribute('data-theme')
        );

        // Install a backend plugin and verify its nodes appear in the palette
        // after the designer fetches /api/plugins on boot.
        const pluginInstall = await (await fetch(`${base}/api/plugins/redis/install`, { method: 'POST' })).json();
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('.workflow-palette-item[data-node-type="redis-command"]', { timeout: 15000 });
        const pluginNodeVisible = await page.locator('.workflow-palette-item[data-node-type="redis-command"]').count() > 0;
        await fetch(`${base}/api/plugins/redis`, { method: 'DELETE' });

        // Tabs: save a copy, open the original in a second tab, persist the set
        // across a reload, then create/close a blank document from the tab bar.
        await page.locator('.workflow-toolbar .workflow-btn', { hasText: 'Workflows' }).first().click();
        await page.waitForSelector('.workflow-library-panel');
        await page.locator('.workflow-library-panel .workflow-btn', { hasText: 'Save as copy' }).click();
        await page.waitForTimeout(300);
        const originalRow = page.locator('.workflow-library-row').filter({
            has: page.locator('.workflow-library-row-name', { hasText: /^Approval workflow$/ })
        }).first();
        await originalRow.locator('.workflow-btn', { hasText: 'Open' }).click();
        await page.waitForTimeout(300);
        const tabCount = await page.locator('.workflow-tabs .tab').count();
        const tabState = await page.evaluate(() => {
            const raw = localStorage.getItem('workflow-designer-open-tabs');
            try { return raw ? JSON.parse(raw) : undefined; } catch { return undefined; }
        });

        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(() => document.querySelectorAll('.workflow-tabs .tab').length === 2, { timeout: 15000 });
        const restoredTabCount = await page.locator('.workflow-tabs .tab').count();
        const restoredTabLabel = await page.locator('.workflow-tabs .tab[aria-selected="true"] .tab-label').textContent();
        await page.locator('.workflow-tabs .tab-new').click();
        await page.waitForTimeout(200);
        const newTabCount = await page.locator('.workflow-tabs .tab').count();
        const newTabNodeCount = await page.evaluate(() => window.workflowDesigner.designer.nodes.length);
        const newTabEmptyHint = await page.locator('.workflow-canvas-empty').count() > 0;
        const newTabState = await page.evaluate(() => {
            const raw = localStorage.getItem('workflow-designer-open-tabs');
            return {
                state: raw ? JSON.parse(raw) : undefined,
                activeId: window.workflowDesigner.designer.definition.id
            };
        });
        await page.locator('.workflow-tabs .tab[aria-selected="true"] .tab-close').click();
        await page.waitForTimeout(200);
        const closedTabCount = await page.locator('.workflow-tabs .tab').count();

        await browser.close();

        const result = { before, initialJsBytes, lazyEditorChunk, hintEnv, hintAction, shortcutsOpened, shortcutsClosed, autosaveName, autosaveCode, autosaveState, wheelZoom, wheelPan, menuOpen, menuEntries, menuClosed, paletteFiltered, paletteRestored, deleteDisabledBefore, deleteEnabledAfter, localePreserved, fitVisible, optionCount, compareHidden, compareVisible, compareHiddenAgain, actionPlaceholder, groupTitles, retrySet, retryReset, codeEditor, codeText: String(codeText || '').trim().slice(0, 40), codeApplied, formInvalid, formValid, resized, collapsed, restored, connection, edgeSelected, themeMenuItems, checkedTheme, solarizedTheme, lightThemeRestored, inlineThemeToggle, darkTheme, layoutTheme, themeStored, themeAfterReload, pluginInstall, pluginNodeVisible, tabCount, tabState, restoredTabCount, restoredTabLabel, newTabCount, newTabNodeCount, newTabEmptyHint, newTabState, closedTabCount, inspectorRendered, after, logs, libraryRows, apiWorkflows: apiList.length, errors };
        console.log(JSON.stringify(result, null, 2));
        if (errors.length || initialJsBytes > 640_000 || !lazyEditorChunk || !hintEnv || !hintAction || !shortcutsOpened || !shortcutsClosed
            || autosaveName !== 'Function Node' || autosaveCode !== 'return 42;' || !wheelZoom || !wheelPan || !before.edgeVisible || !before.panesScrollable || before.portHitSize < 20
            || !menuOpen || menuEntries < 5 || !menuClosed
            || paletteFiltered < 1 || paletteFiltered >= 35 || paletteRestored !== 35
            || !deleteDisabledBefore || !deleteEnabledAfter || localePreserved.count !== 8 || localePreserved.locale !== 'zh-CN' || !fitVisible
            || optionCount !== 5 || !compareHidden || !compareVisible || !compareHiddenAgain
            || actionPlaceholder !== 'actions.fetch' || !groupTitles.includes('Reliability')
            || !retrySet || !retryReset
            || !codeEditor || !codeApplied || !formInvalid || !formValid || !resized || !collapsed || !restored
            || connection.connections !== 7 || !edgeSelected
            || inlineThemeToggle !== 0
            || themeMenuItems !== 4 || !checkedTheme.includes('Solarized')
            || solarizedTheme.attribute !== 'solarized'
            || solarizedTheme.splitter === 'rgb(226, 232, 240)' || solarizedTheme.collapse === 'rgb(255, 255, 255)'
            || lightThemeRestored !== 'light' || darkTheme.attribute !== 'dark'
            || layoutTheme.lightBorders !== 0
            || !layoutTheme.scrollbar.includes('rgb(51, 65, 85)')
            || !layoutTheme.leftScrollbar.includes('rgb(51, 65, 85)')
            || !layoutTheme.canvasScrollbar.includes('rgb(51, 65, 85)')
            || themeStored !== 'dark' || themeAfterReload !== 'dark'
            || !pluginInstall?.installed || !pluginNodeVisible || !inspectorRendered
            || tabCount !== 2 || tabState?.openIds?.length !== 2
            || restoredTabCount !== 2 || !String(restoredTabLabel || '').includes('Approval workflow')
            || newTabCount !== 3 || newTabNodeCount !== 0 || !newTabEmptyHint
            || newTabState?.state?.openIds?.length !== 2
            || newTabState?.state?.openIds?.includes(newTabState.activeId)
            || closedTabCount !== 2) {
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
        if (previousDb === undefined) {
            delete process.env.WORKFLOW_DB_FILE;
        } else {
            process.env.WORKFLOW_DB_FILE = previousDb;
        }
        fs.rmSync(dbDir, { recursive: true, force: true });
    }
})();
