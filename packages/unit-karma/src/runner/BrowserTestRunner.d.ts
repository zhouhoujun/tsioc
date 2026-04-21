import { SuiteDescribe, ICaseDescribe } from '@tsdi/unit';
import { BrowserTestCompileOptions } from '../compiler/BrowserTestCompiler';
import { BrowserLauncherOptions, BrowserPage } from '../launcher/BrowserLauncher';
import { TestServerOptions } from '../server/TestServer';
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
export declare class BrowserTestRunner {
    private compiler;
    private injector;
    private testServer;
    private browser;
    private compileResult;
    private launcher;
    private getLauncher;
    run(options: BrowserTestRunnerOptions): Promise<BrowserTestResult>;
    runSuite(page: BrowserPage, desc: SuiteDescribe): Promise<void>;
    runCase(page: BrowserPage, caseDesc: ICaseDescribe): Promise<ICaseDescribe>;
    private compileTests;
    private startServer;
    private setupServerHandlers;
    private launchBrowser;
    private executeTests;
    private cleanup;
}
