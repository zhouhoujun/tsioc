import { Injectable, Inject, Injector } from '@tsdi/ioc';
import { SuiteDescribe, ICaseDescribe } from '@tsdi/unit';
import { BrowserTestCompiler, BrowserTestCompileOptions, BrowserTestCompileResult } from '../compiler/BrowserTestCompiler';
import { BrowserLauncher, BrowserLauncherOptions, BrowserInstance, BrowserPage, AutoBrowserLauncher } from '../launcher/BrowserLauncher';
import { TestServer, TestServerOptions } from '../server/TestServer';
import { E2EOptions } from '@tsdi/unit';

export interface BrowserTestRunnerOptions {
    src: string | string[];
    outDir?: string;
    baseURL?: string;
    browser?: BrowserLauncherOptions;
    server?: TestServerOptions;
    e2e?: E2EOptions;
    coverage?: boolean;
    compile?: Partial<BrowserTestCompileOptions>;
    timeout?: number;
    retries?: number;
    parallel?: boolean;
}

export interface BrowserTestResult {
    suites: SuiteDescribe[];
    total: number;
    passed: number;
    failed: number;
    duration: number;
    coverage?: any;
    errors: Error[];
}

@Injectable()
export class BrowserTestRunner {

    @Inject()
    private compiler!: BrowserTestCompiler;

    @Inject()
    private injector!: Injector;

    @Inject()
    private testServer!: TestServer;

    private browser: BrowserInstance | null = null;
    private compileResult: BrowserTestCompileResult | null = null;
    private launcher: AutoBrowserLauncher | null = null;

    private getLauncher(): AutoBrowserLauncher {
        if (!this.launcher) {
            this.launcher = this.injector.get(AutoBrowserLauncher) ?? new AutoBrowserLauncher();
        }
        return this.launcher;
    }

    async run(options: BrowserTestRunnerOptions): Promise<BrowserTestResult> {
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
        } catch (error) {
            console.error('Browser test execution failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    async runSuite(page: BrowserPage, desc: SuiteDescribe): Promise<void> {
        if (!page) {
            throw new Error('No browser page available');
        }

        const suiteDescribe = desc.describe;
        await page.evaluate(() => {
            console.log(`Running suite: ${(globalThis as any).__suite__}`);
        });

        for (const caseDesc of desc.cases) {
            await this.runCase(page, caseDesc);
        }
    }

    async runCase(page: BrowserPage, caseDesc: ICaseDescribe): Promise<ICaseDescribe> {
        if (!page) {
            caseDesc.error = new Error('No browser page available');
            return caseDesc;
        }

        const startTime = Date.now();

        try {
            const testTitle = caseDesc.title;
            await page.evaluate(() => {
                console.log(`Running test: ${(globalThis as any).__test__}`);
                return { success: true };
            });

            caseDesc.used = [Math.floor((Date.now() - startTime) / 1000), 0];
        } catch (error) {
            caseDesc.error = error as Error;
            caseDesc.used = [Math.floor((Date.now() - startTime) / 1000), 0];
        }

        return caseDesc;
    }

    private async compileTests(options: BrowserTestRunnerOptions): Promise<void> {
        const compileOptions: BrowserTestCompileOptions = {
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

    private async startServer(options: BrowserTestRunnerOptions): Promise<void> {
        const serverOptions: TestServerOptions = {
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

    private setupServerHandlers(): void {
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

    private async launchBrowser(options: BrowserTestRunnerOptions): Promise<void> {
        const browserOptions: BrowserLauncherOptions = {
            browser: options.browser?.browser || 'auto' as any,
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

    private async executeTests(options: BrowserTestRunnerOptions): Promise<BrowserTestResult> {
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

        page.on('console', (msg: any) => {
            console.log('[Browser Console]', msg.text || msg.args?.join(' '));
        });

        page.on('pageerror', (error: Error) => {
            console.error('[Browser Error]', error.message);
        });

        await page.exposeFunction('reportTestResult', (result: any) => {
            this.testServer.broadcast('test:result', result);
        });

        await page.exposeFunction('reportCoverage', (coverage: any) => {
            this.testServer.broadcast('coverage:data', coverage);
        });

        try {
            const result = await page.evaluate(async () => {
                if (typeof (window as any).runTests === 'function') {
                    return await (window as any).runTests();
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
        } finally {
            await page.close();
            await context.close();
        }
    }

    private async cleanup(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }

        if (this.testServer.isRunning()) {
            await this.testServer.stop();
        }
    }
}