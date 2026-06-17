import { Module, Provider, AbstractType, Type, Token, ModuleWithProviders, ModuleType } from '@tsdi/ioc';
import { Application, ApplicationArguments, AppMode, AppPlatform, LoadType } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { AopModule } from '@tsdi/aop';
import { UNITTESTCONFIGURE, UnitTestConfigureService } from './configure';
import { UnitTestConfigure } from './UnitTestConfigure';
import { UnitTestService } from './UnitTestService';
import { RunAspect } from './aop/RunAspect';
import { OldTestRunner } from './runner/OldTestRunner';
import { DefaultTestReport } from './reports/TestReport';
import { SuiteRunner } from './runner/SuiteRunner';
import { E2ERunner } from './runner/E2ERunner';

class UnitTestApplicationArguments extends ApplicationArguments {
    private _baseURL: string;
    private _envOverride: Partial<ApplicationArguments> = {};

    constructor(baseURL: string) {
        super();
        this._baseURL = baseURL;
    }

    get argsSource(): string[] { return []; }
    get args(): Record<string, string> { return {}; }
    get cmds(): string[] { return []; }
    get env(): Record<string, any> { return {}; }
    get signls(): string[] { return []; }

    get name(): string { return 'unit-test'; }
    get version(): string { return '1.0.0'; }
    get mode(): AppMode { return 'test'; }
    get platform(): AppPlatform { return 'node'; }
    get cwd(): string { return this._envOverride.cwd ?? this._baseURL; }
    get hostname(): string { return 'localhost'; }
    get pid(): number { return process.pid; }
    get locale(): string { return 'en-US'; }
    get timezone(): string { return 'UTC'; }
    get debug(): boolean { return true; }
    get logLevel(): string { return 'debug'; }
    get baseURL(): string { return this._envOverride.baseURL ?? this._baseURL; }

    reset(): void { }
    mergeEnvironment(env: Partial<ApplicationArguments>): void {
        this._envOverride = { ...this._envOverride, ...env };
    }
}

@Module({
    imports: [
        AopModule,
        LoggerModule
    ],
    providers: [
        UnitTestConfigureService,
        RunAspect,
        SuiteRunner,
        E2ERunner,
        OldTestRunner,
        DefaultTestReport
    ],
    declarations: [
        UnitTestService
    ],
    bootstrap: UnitTestService
})
export class UnitTest { }


function parseCoverageFromArgs(): boolean {
    const args = process.argv.slice(2);

    const coverageEnabled = args.includes('--coverage') || args.includes('-c') || args.includes('--coverage=true');
    const envCoverageEnabled = process.env.COVERAGE === '1' || process.env.COVERAGE === 'true';

    return coverageEnabled || envCoverageEnabled;
}

function resolveCoverageDir(config?: UnitTestConfigure): string {
    if (config?.coverage?.outputDir) {
        return config.coverage.outputDir;
    }
    return '.nyc_output';
}

function detectEnvironment(): 'node' | 'browser' {
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
        return 'browser';
    }
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        return 'node';
    }
    return 'node';
}

async function loadEnvironmentModule(env?: AppPlatform, coverageEnabled?: boolean): Promise<ModuleType<Type>[]> {
    const actualEnv = env ?? detectEnvironment();
    const resports: ModuleType<Type>[] = [];

    try {
        const module = await import('@tsdi/unit-console');
        resports.push(module.ConsoleModule.withOptions(coverageEnabled));

    } catch (e) {
        console.warn('Failed to load @tsdi/unit-console. Install it with: npm install @tsdi/unit-console');
        // return {};
    }
    if (actualEnv === 'browser' || actualEnv === 'web') {
        try {
            const module = await import('@tsdi/unit-karma');
            resports.push(module.KarmaModule.withOptions(coverageEnabled));
        } catch (e) {
            console.warn('Failed to load @tsdi/unit-karma. Install it with: npm install @tsdi/unit-karma');
        }
    }
    return resports
}

export async function runTest(src: string | AbstractType | (string | AbstractType)[], config?: UnitTestConfigure): Promise<any> {
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
            reporters: config?.coverage?.reporters || ['text', 'text-summary'] as ('text' | 'text-summary')[],
            include: config?.coverage?.include || ['**/src/**/*.ts'],
            exclude: config?.coverage?.exclude || ['test/**/*.ts', '**/*.spec.ts', '**/*.test.ts', '**/node_modules/**'],
            outputDir: coverageDir

        };
    }

    const providers: Provider[] = [
        {
            provide: UNITTESTCONFIGURE,
            useValue: finalConfig
        }
    ];
    if (finalConfig?.baseURL) {
        providers.push({
            provide: ApplicationArguments,
            useClass: UnitTestApplicationArguments,
            useFactory: () => new UnitTestApplicationArguments(finalConfig.baseURL!)
        });
    }
    const ctx = await Application.run(UnitTest, {
        ...config,
        loadDeps,
        providers
    });

    await ctx.close();
}
