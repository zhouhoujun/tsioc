import { isString, lang } from '@tsdi/ioc';
import { ConfigureLoggerManager, ILogger, LogConfigure } from '@tsdi/logs';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { ApplicationContext, Application, formatDate, PROCESS_ROOT } from '../src';
import { logConfig, ServerMainModule } from './demo';
import * as log4js from 'log4js';
import * as fs from 'node:fs';
import * as path from 'node:path';
const del = require('del');

const dir = __dirname;
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
                { provide: PROCESS_ROOT, useValue: dir },
                { provide: LogConfigure, useValue: logConfig }
            ]
        });
        console.log(this.ctx.baseURL);
        this.logdir = path.join(this.ctx.baseURL, 'log-caches');
        await del(this.logdir);
        const now = new Date();
        this.logfile = path.join(this.ctx.baseURL, `log-caches/focas.-${formatDate(now).replace(/(-|\/)/g, '')}.log`);
    }

    @Test()
    isLog4js() {
        const cfg = this.ctx.resolve(LogConfigure);
        expect(cfg).toBeDefined();
        const loggerMgr = this.ctx.resolve(ConfigureLoggerManager);
        expect(loggerMgr).toBeInstanceOf(ConfigureLoggerManager);
        const logger = loggerMgr.getLogger() as ILogger;
        expect(logger).toBeDefined();
        expect((logger as log4js.Logger).category).toEqual('default');
    }


    @Test()
    async canWriteLogFile() {
        const msg = 'log file test';
        this.ctx.getLogger().info(msg);
        await lang.delay(10);
        expect(fs.existsSync(this.logfile)).toBeTruthy();
        const content = fs.readFileSync(this.logfile, 'utf-8');
        expect(isString(content)).toBeTruthy();
        expect(content.indexOf(msg)).toBeGreaterThan(0);
    }



    @After()
    async after() {
        this.ctx.destroy();
        await del(this.logdir);
    }
}