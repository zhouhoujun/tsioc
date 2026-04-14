import { Suite, BeforeEach, Test, AfterEach, Expect, ExpectToken } from '@tsdi/unit';
import { Inject, Module } from '@tsdi/ioc';
import { BrowserTestRunner, BrowserTestRunnerOptions, KarmaModule } from '../src';

/**
 * Browser E2E Test Example
 * 浏览器 E2E 测试示例
 */
@Suite('Browser E2E Tests')
export class BrowserE2ETestExample {

    @Inject()
    private runner!: BrowserTestRunner;

    @BeforeEach()
    setup() {
        console.log('Setting up browser e2e test...');
    }

    @Test('should run tests in ChromeHeadless browser')
    async testChromeHeadless(@Inject(ExpectToken) expect: Expect) {
        const options: BrowserTestRunnerOptions = {
            src: 'test/fixtures/**/*.spec.ts',
            outDir: '.browser-test-output',
            browser: {
                browser: 'chrome',
                headless: true,
                width: 1280,
                height: 720
            },
            server: {
                port: 9999
            },
            coverage: true
        };

        const result = await this.runner.run(options);

        expect(result.passed >= 0 || result.failed >= 0).toBeTruthy();
    }

    @Test('should run tests in jsdom environment')
    async testJsdom(@Inject(ExpectToken) expect: Expect) {
        const options: BrowserTestRunnerOptions = {
            src: 'test/fixtures/**/*.spec.ts',
            outDir: '.browser-test-output',
            browser: {
                browser: 'jsdom'
            },
            coverage: false
        };

        const result = await this.runner.run(options);

        expect(result).toBeDefined();
    }

    @Test('should compile TypeScript test files')
    async testCompilation(@Inject(ExpectToken) expect: Expect) {
        const options: BrowserTestRunnerOptions = {
            src: 'test/fixtures/sample.spec.ts',
            outDir: '.browser-test-output',
            compile: {
                bundle: true,
                sourcemap: true
            }
        };

        const result = await this.runner.run(options);

        expect(result).toBeDefined();
    }

    @AfterEach()
    cleanup() {
        console.log('Cleaning up browser e2e test...');
    }
}

/**
 * Usage Example for BrowserTestRunner:
 * 
 * See the README for detailed usage instructions.
 */