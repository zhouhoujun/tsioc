"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserTestRunner = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const BrowserTestCompiler_1 = require("../compiler/BrowserTestCompiler");
const BrowserLauncher_1 = require("../launcher/BrowserLauncher");
const TestServer_1 = require("../server/TestServer");
let BrowserTestRunner = class BrowserTestRunner {
    constructor() {
        this.browser = null;
        this.compileResult = null;
        this.launcher = null;
    }
    getLauncher() {
        if (!this.launcher) {
            this.launcher = this.injector.get(BrowserLauncher_1.AutoBrowserLauncher) ?? new BrowserLauncher_1.AutoBrowserLauncher();
        }
        return this.launcher;
    }
    async run(options) {
        const startTime = Date.now();
        try {
            await this.compileTests(options);
            await this.startServer(options);
            await this.launchBrowser(options);
            const result = await this.executeTests(options);
            return {
                ...result,
                duration: Date.now() - startTime
            };
        }
        catch (error) {
            console.error('Browser test execution failed:', error);
            throw error;
        }
        finally {
            await this.cleanup();
        }
    }
    async runSuite(page, desc) {
        if (!page) {
            throw new Error('No browser page available');
        }
        const suiteDescribe = desc.describe;
        await page.evaluate(() => {
            console.log(`Running suite: ${globalThis.__suite__}`);
        });
        for (const caseDesc of desc.cases) {
            await this.runCase(page, caseDesc);
        }
    }
    async runCase(page, caseDesc) {
        if (!page) {
            caseDesc.error = new Error('No browser page available');
            return caseDesc;
        }
        const startTime = Date.now();
        try {
            const testTitle = caseDesc.title;
            await page.evaluate(() => {
                console.log(`Running test: ${globalThis.__test__}`);
                return { success: true };
            });
            caseDesc.used = [Math.floor((Date.now() - startTime) / 1000), 0];
        }
        catch (error) {
            caseDesc.error = error;
            caseDesc.used = [Math.floor((Date.now() - startTime) / 1000), 0];
        }
        return caseDesc;
    }
    async compileTests(options) {
        const compileOptions = {
            src: options.src,
            outDir: options.outDir || '.browser-test',
            baseURL: options.baseURL,
            coverage: options.coverage,
            bundle: true,
            sourcemap: true,
            ...options.compile
        };
        this.compileResult = options.coverage
            ? await this.compiler.compileWithCoverage(compileOptions)
            : await this.compiler.compile(compileOptions);
        if (!this.compileResult.success) {
            const errors = this.compileResult.errors.map(e => e.text).join('\n');
            throw new Error(`Compilation failed:\n${errors}`);
        }
    }
    async startServer(options) {
        const serverOptions = {
            port: options.server?.port || 9876,
            host: options.server?.host || 'localhost',
            baseDir: options.outDir || '.browser-test',
            websocket: true,
            cors: true,
            ...options.server
        };
        const url = await this.testServer.start(serverOptions);
        console.log(`Test server started at ${url}`);
        this.setupServerHandlers();
    }
    setupServerHandlers() {
        this.testServer.onMessage('test:result', (payload) => {
            console.log(`Test result: ${payload.title} - ${payload.success ? 'PASS' : 'FAIL'}`);
        });
        this.testServer.onMessage('coverage:data', (payload) => {
            console.log('Coverage data received');
        });
        this.testServer.onMessage('error', (payload) => {
            console.error('Browser error:', payload.message);
        });
        this.testServer.onMessage('log', (payload) => {
            console.log('[Browser]', ...payload.args);
        });
    }
    async launchBrowser(options) {
        const browserOptions = {
            browser: options.browser?.browser || 'auto',
            headless: options.e2e?.headless ?? options.browser?.headless ?? true,
            width: options.e2e?.viewport?.width || options.browser?.width || 1280,
            height: options.e2e?.viewport?.height || options.browser?.height || 720,
            timeout: options.timeout || 30000,
            ...options.browser
        };
        const launcher = this.getLauncher();
        this.browser = await launcher.launch(browserOptions);
        console.log(`Browser launched: ${launcher.name}`);
    }
    async executeTests(options) {
        if (!this.browser) {
            throw new Error('Browser not launched');
        }
        const context = await this.browser.newContext();
        const page = await context.newPage();
        const testUrl = this.testServer.getUrl();
        if (this.compileResult?.entryFile) {
            const entryPath = this.compileResult.entryFile.split('/').pop();
            await page.goto(`${testUrl}/${entryPath}`, {
                timeout: options.timeout || 30000,
                waitUntil: 'networkidle0'
            });
        }
        page.on('console', (msg) => {
            console.log('[Browser Console]', msg.text || msg.args?.join(' '));
        });
        page.on('pageerror', (error) => {
            console.error('[Browser Error]', error.message);
        });
        await page.exposeFunction('reportTestResult', (result) => {
            this.testServer.broadcast('test:result', result);
        });
        await page.exposeFunction('reportCoverage', (coverage) => {
            this.testServer.broadcast('coverage:data', coverage);
        });
        try {
            const result = await page.evaluate(async () => {
                if (typeof window.runTests === 'function') {
                    return await window.runTests();
                }
                return { total: 0, passed: 0, failed: 0 };
            });
            return {
                suites: [],
                total: result.total,
                passed: result.passed,
                failed: result.failed,
                duration: 0,
                errors: []
            };
        }
        finally {
            await page.close();
            await context.close();
        }
    }
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
        if (this.testServer.isRunning()) {
            await this.testServer.stop();
        }
    }
};
exports.BrowserTestRunner = BrowserTestRunner;
tslib_1.__decorate([
    (0, ioc_1.Inject)(),
    tslib_1.__metadata("design:type", BrowserTestCompiler_1.BrowserTestCompiler)
], BrowserTestRunner.prototype, "compiler", void 0);
tslib_1.__decorate([
    (0, ioc_1.Inject)(),
    tslib_1.__metadata("design:type", ioc_1.Injector)
], BrowserTestRunner.prototype, "injector", void 0);
tslib_1.__decorate([
    (0, ioc_1.Inject)(),
    tslib_1.__metadata("design:type", TestServer_1.TestServer)
], BrowserTestRunner.prototype, "testServer", void 0);
exports.BrowserTestRunner = BrowserTestRunner = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], BrowserTestRunner);
//# sourceMappingURL=BrowserTestRunner.js.map