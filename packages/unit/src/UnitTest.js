"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitTest = void 0;
exports.runTest = runTest;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const logger_1 = require("@tsdi/logger");
const aop_1 = require("@tsdi/aop");
const configure_1 = require("./configure");
const UnitTestService_1 = require("./UnitTestService");
const RunAspect_1 = require("./aop/RunAspect");
const OldTestRunner_1 = require("./runner/OldTestRunner");
const TestReport_1 = require("./reports/TestReport");
const SuiteRunner_1 = require("./runner/SuiteRunner");
const E2ERunner_1 = require("./runner/E2ERunner");
class UnitTestApplicationArguments extends core_1.ApplicationArguments {
    constructor(baseURL) {
        super();
        this._envOverride = {};
        this._baseURL = baseURL;
    }
    get argsSource() { return []; }
    get args() { return {}; }
    get cmds() { return []; }
    get env() { return {}; }
    get signls() { return []; }
    get name() { return 'unit-test'; }
    get version() { return '1.0.0'; }
    get mode() { return 'test'; }
    get platform() { return 'node'; }
    get cwd() { return this._envOverride.cwd ?? this._baseURL; }
    get hostname() { return 'localhost'; }
    get pid() { return process.pid; }
    get locale() { return 'en-US'; }
    get timezone() { return 'UTC'; }
    get debug() { return true; }
    get logLevel() { return 'debug'; }
    get baseURL() { return this._envOverride.baseURL ?? this._baseURL; }
    reset() { }
    mergeEnvironment(env) {
        this._envOverride = { ...this._envOverride, ...env };
    }
}
let UnitTest = class UnitTest {
};
exports.UnitTest = UnitTest;
exports.UnitTest = UnitTest = tslib_1.__decorate([
    (0, ioc_1.Module)({
        imports: [
            aop_1.AopModule,
            logger_1.LoggerModule
        ],
        providers: [
            configure_1.UnitTestConfigureService,
            RunAspect_1.RunAspect,
            SuiteRunner_1.SuiteRunner,
            E2ERunner_1.E2ERunner,
            OldTestRunner_1.OldTestRunner,
            TestReport_1.DefaultTestReport
        ],
        declarations: [
            UnitTestService_1.UnitTestService
        ],
        bootstrap: UnitTestService_1.UnitTestService
    })
], UnitTest);
function parseCoverageFromArgs() {
    const args = process.argv.slice(2);
    const coverageEnabled = args.includes('--coverage') || args.includes('-c') || args.includes('--coverage=true');
    const envCoverageEnabled = process.env.COVERAGE === '1' || process.env.COVERAGE === 'true';
    return coverageEnabled || envCoverageEnabled;
}
function resolveCoverageDir(config) {
    if (config?.coverage?.outputDir) {
        return config.coverage.outputDir;
    }
    return '.nyc_output';
}
function detectEnvironment() {
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
        return 'browser';
    }
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        return 'node';
    }
    return 'node';
}
async function loadEnvironmentModule(env, coverageEnabled) {
    const actualEnv = env ?? detectEnvironment();
    const resports = [];
    try {
        const module = await Promise.resolve().then(() => require('@tsdi/unit-console'));
        resports.push(module.ConsoleModule.withOptions(coverageEnabled));
    }
    catch (e) {
        console.warn('Failed to load @tsdi/unit-console. Install it with: npm install @tsdi/unit-console');
        // return {};
    }
    if (actualEnv === 'browser' || actualEnv === 'web') {
        try {
            const module = await Promise.resolve().then(() => require('@tsdi/unit-karma'));
            resports.push(module.KarmaModule.withOptions(coverageEnabled));
        }
        catch (e) {
            console.warn('Failed to load @tsdi/unit-karma. Install it with: npm install @tsdi/unit-karma');
        }
    }
    return resports;
}
async function runTest(src, config) {
    const coverageEnabled = parseCoverageFromArgs() || config?.coverage?.enabled === true;
    let finalConfig = {
        src,
        ...config
    };
    const loadDeps = await loadEnvironmentModule(config?.platform, coverageEnabled);
    if (coverageEnabled) {
        const coverageDir = resolveCoverageDir(config);
        if (process && process.env && !process.env.NODE_V8_COVERAGE) {
            process.env.NODE_V8_COVERAGE = coverageDir;
        }
        finalConfig.coverage = {
            enabled: true,
            ...config?.coverage,
            reporters: config?.coverage?.reporters || ['text', 'text-summary'],
            include: config?.coverage?.include || ['**/src/**/*.ts'],
            exclude: config?.coverage?.exclude || ['test/**/*.ts', '**/*.spec.ts', '**/*.test.ts', '**/node_modules/**'],
            outputDir: coverageDir
        };
    }
    const providers = [
        {
            provide: configure_1.UNITTESTCONFIGURE,
            useValue: finalConfig
        }
    ];
    if (finalConfig?.baseURL) {
        providers.push({
            provide: core_1.ApplicationArguments,
            useClass: UnitTestApplicationArguments,
            useFactory: () => new UnitTestApplicationArguments(finalConfig.baseURL)
        });
    }
    await core_1.Application.run(UnitTest, {
        ...config,
        loadDeps,
        providers
    });
}
//# sourceMappingURL=UnitTest.js.map