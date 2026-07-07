# packaged @tsdi/unit-karma

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/unit-karma`: unit testing karma reporter with browser test support, base on AOP, IoC container.

version 6+ of [`@tsdi/core`](https://www.npmjs.com/package/@tsdi/core) [`tsioc`](https://www.npmjs.com/package/tsioc)

## Features

- **KarmaReporter**: Browser-friendly test reporter with DOM rendering support
- **CoverageReporter**: Istanbul-style coverage reporting (text, json, html, lcov, cobertura)
- **BrowserTestRunner**: Run tests in ChromeHeadless or jsdom environment
- **BrowserTestCompiler**: Compile TypeScript tests with esbuild for browser execution
- **TestServer**: HTTP/WebSocket server for browser test file serving
- **BrowserLauncher**: Auto-detecting browser launcher (Chrome/jsdom)

## Install

```shell
npm install @tsdi/unit
npm install @tsdi/unit-karma

# in browser
npm install @tsdi/platform-browser

# in server
npm install @tsdi/platform-server

# optional: for Chrome headless testing
npm install puppeteer

# optional: for jsdom testing
npm install jsdom
```

## Usage

### Basic Unit Test

```ts
import { Suite, BeforeEach, Test, After, AfterEach, Assert, Expect, ExpectToken } from '@tsdi/unit';
import { Inject } from '@tsdi/ioc';
import { KarmaReporter } from '@tsdi/unit-karma';

@Suite('Unit Test')
export class SuiteTest {

    @BeforeEach()
    async initTest() {
        console.log('---------before test-----------');
    }

    @Test('basic test')
    testBasic(@Inject(ExpectToken) expect: Expect) {
        expect(1 + 1).toBe(2);
    }

    @Test('assert test')
    testAssert(assert: Assert) {
        assert.strictEqual('hello', 'hello');
    }

    @AfterEach()
    clean() {
        // clean each data
    }

    @After()
    destroy() {
        // cleanup
    }
}
```

### Browser E2E Tests

```ts
import { Suite, BeforeEach, Test, AfterEach, Expect, ExpectToken } from '@tsdi/unit';
import { Module, Inject } from '@tsdi/ioc';
import { BrowserTestRunner, BrowserTestRunnerOptions, KarmaModule } from '@tsdi/unit-karma';

@Module({
    imports: [KarmaModule]
})
@Suite('Browser E2E Tests')
export class BrowserE2ETest {

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
            coverage: true
        };

        const result = await this.runner.run(options);
        expect(result.passed >= 0).toBeTruthy();
    }

    @Test('should run tests in jsdom environment')
    async testJsdom(@Inject(ExpectToken) expect: Expect) {
        const options: BrowserTestRunnerOptions = {
            src: 'test/fixtures/**/*.spec.ts',
            browser: { browser: 'jsdom' },
            coverage: false
        };

        const result = await this.runner.run(options);
        expect(result).toBeDefined();
    }

    @AfterEach()
    cleanup() {
        console.log('Cleaning up browser e2e test...');
    }
}
```

### Coverage Reporting

```ts
import { Suite, BeforeEach, Test, Expect, ExpectToken } from '@tsdi/unit';
import { Inject, Token } from '@tsdi/ioc';
import { CoverageReporter, CoverageOptions } from '@tsdi/unit-karma';
import { SuiteDescribe } from '@tsdi/unit';

@Suite('Coverage Test Suite')
export class CoverageTest {

    @Inject()
    private reporter!: CoverageReporter;

    @BeforeEach()
    setup() {
        this.reporter.setOptions({
            enabled: true,
            reporters: ['text-summary', 'json', 'html'],
            outputDir: 'coverage',
            threshold: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80
            }
        });
    }

    @Test('should render coverage report')
    async testCoverage(@Inject(ExpectToken) expect: Expect) {
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('test-suite', {
            describe: 'Test Suite',
            cases: [{ title: 'test', key: 't1', used: [1000000, 0] }],
            start: [0, 0]
        });

        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }
}
```

### KarmaModule Configuration

```ts
import { Module } from '@tsdi/ioc';
import { KarmaModule } from '@tsdi/unit-karma';

// Basic usage
@Module({
    imports: [KarmaModule]
})
export class TestModule {}

// With coverage enabled
@Module({
    imports: [KarmaModule.withOptions(true)]
})
export class TestModuleWithCoverage {}
```

### Run Tests

#### Using runTest function

```ts
import { runTest } from '@tsdi/unit';
import { KarmaReporter } from '@tsdi/unit-karma';

runTest('./test/**/*.ts', { baseURL: __dirname }, KarmaReporter);
```

#### Using tsdi CLI

```shell
tsdi test                  # default load test/**/*.ts
tsdi test test/**/*.ts     # specify test files
```

#### Using npm script

```shell
cd packages/unit-karma
npm test
```

## API

### KarmaReporter

Browser-friendly test reporter that renders to both console and DOM.

- `track(error: Error)`: Track and throw errors
- `renderSuite(desc: SuiteDescribe)`: Render suite header
- `renderCase(desc: ICaseDescribe)`: Render individual test case
- `render(suites, total?)`: Render final summary

Uses `DOCUMENT` token from `@tsdi/common` for cross-platform DOM access.

### CoverageReporter (alias: KarmaCoverageReporter)

Coverage reporter with multiple output formats.

- `setOptions(options: CoverageOptions)`: Configure coverage settings
- `render(suites, total?)`: Generate coverage reports

**CoverageOptions:**
```ts
interface CoverageOptions {
    enabled?: boolean;
    reporters?: Array<'text' | 'text-summary' | 'json' | 'html' | 'lcov' | 'cobertura'>;
    include?: string[];
    exclude?: string[];
    outputDir?: string;
    threshold?: {
        lines?: number;
        functions?: number;
        branches?: number;
        statements?: number;
    };
}
```

### BrowserTestRunner

Runner for browser-based tests.

**BrowserTestRunnerOptions:**
```ts
interface BrowserTestRunnerOptions {
    src: string | string[];
    outDir?: string;
    baseURL?: string;
    browser?: BrowserLauncherOptions;
    server?: TestServerOptions;
    coverage?: boolean;
    timeout?: number;
    retries?: number;
    parallel?: boolean;
}
```

**BrowserTestResult:**
```ts
interface BrowserTestResult {
    suites: SuiteDescribe[];
    total: number;
    passed: number;
    failed: number;
    duration: number;
    coverage?: any;
    errors: Error[];
}
```

### BrowserLauncher

Auto-detecting browser launcher supporting Chrome and jsdom.

**BrowserLauncherOptions:**
```ts
interface BrowserLauncherOptions {
    browser?: 'chrome' | 'jsdom' | 'auto';
    headless?: boolean;
    width?: number;
    height?: number;
    timeout?: number;
    executablePath?: string;
    args?: string[];
}
```

### TestServer

HTTP/WebSocket server for browser test file serving.

**TestServerOptions:**
```ts
interface TestServerOptions {
    port?: number;
    host?: string;
    baseDir?: string;
    https?: boolean;
    websocket?: boolean;
    cors?: boolean;
}
```

## TDD/BDD Style Support

### TDD-style

```js
suite('Array', function() {
  suite('#indexOf()', function() {
    suiteSetup(function() {});
    test('should return -1 when not present', function() {});
    test('should return the index when present', function() {});
    suiteTeardown(function() {});
  });
});
```

### BDD-style

```js
describe('Array', function() {
    describe('Array#indexOf()', function() {
        it('should return -1 when not present', function() {});
        it('should return the index when present', function() {});
    });
});
```

## Test Result

![image](https://github.com/zhouhoujun/tsioc/blob/master/packages/unit-karma/assets/ConsoleReport1.png?raw=true)

## Documentation

- [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc)
- [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop)
- [@tsdi/logger document](https://github.com/zhouhoujun/tsioc/tree/master/packages/logger)
- [@tsdi/common document](https://github.com/zhouhoujun/tsioc/tree/master/packages/common)
- [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core)
- [@tsdi/unit document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit)

## Packages

[@tsdi/cli](https://www.npmjs.com/package/@tsdi/cli)
[@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc)
[@tsdi/aop](https://www.npmjs.com/package/@tsdi/aop)
[@tsdi/logger](https://www.npmjs.com/package/@tsdi/logger)
[@tsdi/common](https://www.npmjs.com/package/@tsdi/common)
[@tsdi/core](https://www.npmjs.com/package/@tsdi/core)
[@tsdi/unit](https://www.npmjs.com/package/@tsdi/unit)
[@tsdi/unit-karma](https://www.npmjs.com/package/@tsdi/unit-karma)

## License

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)