import { isString, lang } from '@tsdi/ioc';
import { LoggerManagers, ILogger, LogConfigure, LOG_CONFIGURES } from '@tsdi/logs';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { ApplicationContext, Application, formatDate, PROCESS_ROOT } from '../src';
import { logConfig, ServerMainModule } from './demo';
import * as log4js from 'log4js';
import * as fs from 'fs';
import * as path from 'path';
import del = require('del');

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
                { provide: LOG_CONFIGURES, useValue: logConfig, multi: true }
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
        this.ctx.getLogger().info(msg);
        await lang.delay(20);
        expect(fs.existsSync(this.logfile)).toBeTruthy();
        const content = fs.readFileSync(this.logfile, 'utf-8');
        expect(isString(content)).toBeTruthy();
        expect(content.indexOf(msg)).toBeGreaterThan(0);
    }


    @After()
    async after() {
        await this.ctx.close();
        await del(this.logdir);
    }
}