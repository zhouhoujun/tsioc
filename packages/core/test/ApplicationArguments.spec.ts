import { ApplicationArguments, AppMode, AppPlatform, EnvironmentConfig } from '../src';
import { Injectable, Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '../src';
import { ServerModule } from '@tsdi/platform-server';
import expect = require('expect');

/**
 * Mock ApplicationArguments for testing core interface
 */
@Injectable()
class MockApplicationArguments extends ApplicationArguments {
    private _argsSource: string[];
    private _args: Record<string, string>;
    private _cmds: string[];
    private _env: Record<string, any>;
    private _signls: string[];
    private _config: EnvironmentConfig;

    constructor(
        env: Record<string, any> = {},
        args: string[] = [],
        config: EnvironmentConfig = {}
    ) {
        super();
        this._argsSource = args;
        this._env = env;
        this._config = config;
        this._args = {};
        this._cmds = [];
        this._signls = ['SIGTERM', 'SIGINT'];
        this.parseArgs(args);
    }

    private parseArgs(args: string[]) {
        const argr: Record<string, string> = {};
        const cmds: string[] = [];
        args.forEach(arg => {
            if (arg.startsWith('--')) {
                const [k, val] = arg.slice(2).split('=');
                argr[k] = val || 'true';
            } else {
                cmds.push(arg);
            }
        });
        this._args = argr;
        this._cmds = cmds;
    }

    get argsSource(): string[] { return this._argsSource; }
    get args(): Record<string, string> { return this._args; }
    get cmds(): string[] { return this._cmds; }
    get env(): Record<string, any> { return this._env; }
    get signls(): string[] { return this._signls; }

    get name(): string { return this._config.name ?? this._env.APP_NAME ?? 'test-app'; }
    get version(): string { return this._config.version ?? this._env.APP_VERSION ?? '1.0.0'; }
    get mode(): AppMode { 
        const m = this._config.mode ?? this._env.NODE_ENV ?? 'development';
        if (m === 'prod' || m === 'production') return 'production';
        if (m === 'test' || m === 'testing') return 'test';
        if (m === 'staging' || m === 'stage') return 'staging';
        return 'development';
    }
    get platform(): AppPlatform { return this._config.platform ?? 'node'; }
    get cwd(): string { return this._config.cwd ?? '/test'; }
    get hostname(): string { return this._config.hostname ?? 'localhost'; }
    get pid(): number { return this._config.pid ?? 1; }
    get locale(): string { return this._config.locale ?? 'en-US'; }
    get timezone(): string { return this._config.timezone ?? 'UTC'; }
    get debug(): boolean { return this._config.debug ?? this._env.DEBUG === 'true'; }
    get logLevel(): string { return this._config.logLevel ?? 'info'; }
    get baseURL(): string { return this._config.baseURL ?? '/test'; }

    reset(args: string[]): void {
        this._argsSource = args;
        this.parseArgs(args);
    }

    mergeConfig(config: EnvironmentConfig): void {
        this._config = { ...this._config, ...config };
    }
}

describe('ApplicationArguments', () => {

    describe('base interface properties', () => {
        it('should have argsSource property', () => {
            const args = new MockApplicationArguments({}, ['--port=3000', 'start']);
            expect(args.argsSource).toEqual(['--port=3000', 'start']);
        });

        it('should parse args to record format', () => {
            const args = new MockApplicationArguments({}, ['--port=3000', '--debug', 'start']);
            expect(args.args['port']).toBe('3000');
            expect(args.args['debug']).toBe('true');
        });

        it('should separate commands from args', () => {
            const args = new MockApplicationArguments({}, ['start', 'run', '--port=3000']);
            expect(args.cmds).toEqual(['start', 'run']);
        });

        it('should have env property', () => {
            const env = { NODE_ENV: 'production', DEBUG: 'true' };
            const args = new MockApplicationArguments(env, []);
            expect(args.env).toEqual(env);
        });

        it('should have signls property', () => {
            const args = new MockApplicationArguments({}, []);
            expect(args.signls).toContain('SIGTERM');
            expect(args.signls).toContain('SIGINT');
        });
    });

    describe('new environment properties', () => {
        it('should have name property', () => {
            const args = new MockApplicationArguments({ APP_NAME: 'my-app' }, []);
            expect(args.name).toBe('my-app');
        });

        it('should have version property', () => {
            const args = new MockApplicationArguments({ APP_VERSION: '2.0.0' }, []);
            expect(args.version).toBe('2.0.0');
        });

        it('should have mode property from NODE_ENV', () => {
            const devArgs = new MockApplicationArguments({ NODE_ENV: 'development' }, []);
            expect(devArgs.mode).toBe('development');
            
            const prodArgs = new MockApplicationArguments({ NODE_ENV: 'production' }, []);
            expect(prodArgs.mode).toBe('production');
            
            const testArgs = new MockApplicationArguments({ NODE_ENV: 'test' }, []);
            expect(testArgs.mode).toBe('test');
        });

        it('should have platform property', () => {
            const args = new MockApplicationArguments({}, [], { platform: 'browser' });
            expect(args.platform).toBe('browser');
        });

        it('should have cwd property', () => {
            const args = new MockApplicationArguments({}, [], { cwd: '/app/work' });
            expect(args.cwd).toBe('/app/work');
        });

        it('should have hostname property', () => {
            const args = new MockApplicationArguments({}, [], { hostname: 'my-host' });
            expect(args.hostname).toBe('my-host');
        });

        it('should have pid property', () => {
            const args = new MockApplicationArguments({}, [], { pid: 12345 });
            expect(args.pid).toBe(12345);
        });

        it('should have locale property', () => {
            const args = new MockApplicationArguments({}, [], { locale: 'zh-CN' });
            expect(args.locale).toBe('zh-CN');
        });

        it('should have timezone property', () => {
            const args = new MockApplicationArguments({}, [], { timezone: 'Asia/Shanghai' });
            expect(args.timezone).toBe('Asia/Shanghai');
        });

        it('should have debug property', () => {
            const args = new MockApplicationArguments({ DEBUG: 'true' }, []);
            expect(args.debug).toBe(true);
            
            const noDebugArgs = new MockApplicationArguments({ DEBUG: 'false' }, []);
            expect(noDebugArgs.debug).toBe(false);
        });

        it('should have logLevel property', () => {
            const args = new MockApplicationArguments({}, [], { logLevel: 'debug' });
            expect(args.logLevel).toBe('debug');
        });

        it('should have baseURL property', () => {
            const args = new MockApplicationArguments({}, [], { baseURL: '/api' });
            expect(args.baseURL).toBe('/api');
        });
    });

    describe('helper methods', () => {
        it('should get env value with get() method', () => {
            const args = new MockApplicationArguments({ API_KEY: 'secret' }, []);
            expect(args.get('API_KEY')).toBe('secret');
        });

        it('should return default value when key not found', () => {
            const args = new MockApplicationArguments({}, []);
            expect(args.get('NOT_EXIST', 'default')).toBe('default');
        });

        it('should check env exists with has() method', () => {
            const args = new MockApplicationArguments({ EXIST_KEY: 'value' }, []);
            expect(args.has('EXIST_KEY')).toBe(true);
            expect(args.has('NOT_EXIST')).toBe(false);
        });

        it('should check production mode', () => {
            const prodArgs = new MockApplicationArguments({ NODE_ENV: 'production' }, []);
            expect(prodArgs.isProduction()).toBe(true);
            expect(prodArgs.isDevelopment()).toBe(false);
            
            const devArgs = new MockApplicationArguments({ NODE_ENV: 'development' }, []);
            expect(devArgs.isProduction()).toBe(false);
            expect(devArgs.isDevelopment()).toBe(true);
        });

        it('should check test mode', () => {
            const testArgs = new MockApplicationArguments({ NODE_ENV: 'test' }, []);
            expect(testArgs.isTest()).toBe(true);
            expect(testArgs.isProduction()).toBe(false);
        });

        it('should check staging mode', () => {
            const stagingArgs = new MockApplicationArguments({ NODE_ENV: 'staging' }, []);
            expect(stagingArgs.isStaging()).toBe(true);
        });

        it('should check debug mode', () => {
            const debugArgs = new MockApplicationArguments({ DEBUG: 'true' }, []);
            expect(debugArgs.isDebug()).toBe(true);
            
            const noDebugArgs = new MockApplicationArguments({}, []);
            expect(noDebugArgs.isDebug()).toBe(false);
        });

        it('should check server platform', () => {
            const serverArgs = new MockApplicationArguments({}, [], { platform: 'server' });
            expect(serverArgs.isServer()).toBe(true);
            expect(serverArgs.isBrowser()).toBe(false);
            
            const nodeArgs = new MockApplicationArguments({}, [], { platform: 'node' });
            expect(nodeArgs.isServer()).toBe(true);
        });

        it('should check browser platform', () => {
            const browserArgs = new MockApplicationArguments({}, [], { platform: 'browser' });
            expect(browserArgs.isBrowser()).toBe(true);
            expect(browserArgs.isServer()).toBe(false);
            
            const webArgs = new MockApplicationArguments({}, [], { platform: 'web' });
            expect(webArgs.isBrowser()).toBe(true);
        });

        it('should get all env as copy', () => {
            const env = { KEY1: 'value1', KEY2: 'value2' };
            const args = new MockApplicationArguments(env, []);
            const allEnv = args.getAllEnv();
            expect(allEnv).toEqual(env);
            expect(allEnv).not.toBe(args.env);
        });

        it('should get environment summary', () => {
            const args = new MockApplicationArguments(
                { NODE_ENV: 'production', APP_NAME: 'test-app' },
                [],
                { version: '2.0.0', cwd: '/work', hostname: 'host' }
            );
            const summary = args.getSummary();
            expect(summary.name).toBe('test-app');
            expect(summary.version).toBe('2.0.0');
            expect(summary.mode).toBe('production');
            expect(summary.cwd).toBe('/work');
            expect(summary.hostname).toBe('host');
        });
    });

    describe('reset and merge', () => {
        it('should reset args', () => {
            const args = new MockApplicationArguments({}, ['--port=3000']);
            expect(args.args['port']).toBe('3000');
            
            args.reset(['--port=8080', '--host=localhost']);
            expect(args.argsSource).toEqual(['--port=8080', '--host=localhost']);
            expect(args.args['port']).toBe('8080');
            expect(args.args['host']).toBe('localhost');
        });

        it('should merge config', () => {
            const args = new MockApplicationArguments({}, [], { name: 'initial', version: '1.0' });
            expect(args.name).toBe('initial');
            
            args.mergeConfig({ name: 'updated', debug: true });
            expect(args.name).toBe('updated');
            expect(args.version).toBe('1.0');
            expect(args.debug).toBe(true);
        });
    });

    describe('integration with Application', () => {
        let ctx: ApplicationContext;

        @Module({
            imports: [ServerModule]
        })
        class TestModule {}

        before(async () => {
            ctx = await Application.run(TestModule);
        });

        after(async () => {
            await ctx.close();
        });

        it('should get ApplicationArguments from context', () => {
            const appArgs = ctx.getArguments();
            expect(appArgs).toBeDefined();
            expect(appArgs.argsSource).toBeDefined();
            expect(appArgs.env).toBeDefined();
        });

        it('should have environment properties from server implementation', () => {
            const appArgs = ctx.getArguments();
            expect(appArgs.name).toBeDefined();
            expect(appArgs.version).toBeDefined();
            expect(appArgs.mode).toBeDefined();
            expect(appArgs.platform).toBe('server');
            expect(appArgs.cwd).toBeDefined();
            expect(appArgs.hostname).toBeDefined();
            expect(typeof appArgs.pid).toBe('number');
        });

        it('should use helper methods', () => {
            const appArgs = ctx.getArguments();
            expect(typeof appArgs.isProduction).toBe('function');
            expect(typeof appArgs.isDevelopment).toBe('function');
            expect(typeof appArgs.isTest).toBe('function');
            expect(typeof appArgs.get).toBe('function');
            expect(typeof appArgs.has).toBe('function');
        });

        it('should get environment summary', () => {
            const appArgs = ctx.getArguments();
            const summary = appArgs.getSummary();
            expect(summary).toBeDefined();
            expect(summary.platform).toBe('server');
            expect(typeof summary.pid).toBe('number');
        });
    });
});