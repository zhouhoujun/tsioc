import { isString, lang } from '@tsdi/ioc';
import { LoggerManagers, LOG_CONFIGURES } from '@tsdi/logger';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { ApplicationContext, Application, formatDate, ApplicationArguments, AppMode, AppPlatform } from '../src';
import { logConfig, ServerMainModule } from './demo';
import * as fs from 'fs';
import * as path from 'path';
import { rm } from 'shelljs';

const dir = __dirname;

class TestApplicationArguments extends ApplicationArguments {
    private _envOverride: Partial<ApplicationArguments> = {};
    
    get argsSource(): string[] { return []; }
    get args(): Record<string, string> { return {}; }
    get cmds(): string[] { return []; }
    get env(): Record<string, any> { return {}; }
    get signls(): string[] { return []; }
    
    get name(): string { return 'test-app'; }
    get version(): string { return '1.0.0'; }
    get mode(): AppMode { return 'development'; }
    get platform(): AppPlatform { return 'server'; }
    get cwd(): string { return this._envOverride.cwd ?? dir; }
    get hostname(): string { return 'localhost'; }
    get pid(): number { return process.pid; }
    get locale(): string { return 'en-US'; }
    get timezone(): string { return 'UTC'; }
    get debug(): boolean { return true; }
    get logLevel(): string { return 'debug'; }
    get baseURL(): string { return this._envOverride.baseURL ?? dir; }
    
    reset(): void {}
    mergeEnvironment(env: Partial<ApplicationArguments>): void {
        this._envOverride = { ...this._envOverride, ...env };
    }
}

@Suite()
export class ServerBootTest {

    private ctx!: ApplicationContext;
    private logfile!: string;
    private logdir!: string;

    @Before()
    async init() {
        this.ctx = await Application.run({
            module: ServerMainModule,
            providers: [
                { provide: ApplicationArguments, useClass: TestApplicationArguments },
                { provide: LOG_CONFIGURES, useValue: logConfig, multi: true }
            ]
        });
        console.log(this.ctx.baseURL);
        this.logdir = path.join(this.ctx.baseURL, 'log');
        rm('-rf', this.logdir);
        const now = new Date();
        this.logfile = path.join(this.ctx.baseURL, `log/focas.-${formatDate(now).replace(/(-|\/)/g, '')}.log`);
    }

    @Test()
    isLog4js() {
        const cfgs = this.ctx.get(LOG_CONFIGURES);
        expect(cfgs.length).toBeGreaterThan(0);
        const loggerMgr = this.ctx.resolve(LoggerManagers);
        expect(loggerMgr).toBeInstanceOf(LoggerManagers);
        const logger = loggerMgr.getLogger();
        expect(logger).toBeDefined();
        expect(logger.category).toEqual('default');
    }


    @Test()
    async canWriteLogFile() {
        const msg = 'log file test';
        this.ctx.getLogger('test').info(msg);
        await lang.delay(20);
        expect(fs.existsSync(this.logfile)).toBeTruthy();
        const content = fs.readFileSync(this.logfile, 'utf-8');
        expect(isString(content)).toBeTruthy();
        expect(content.indexOf(msg)).toBeGreaterThan(0);
    }


    @After()
    async after() {
        await this.ctx.close();
        rm('-rf', this.logdir);
    }
}