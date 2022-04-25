import { isString, lang } from '@tsdi/ioc';
import { ConfigureLoggerManager, ILogger, LogConfigure } from '@tsdi/logs';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { ApplicationContext, Application, formatDate, PROCESS_ROOT } from '../src';
import { logConfig, ServerMainModule } from './demo';
import * as log4js from 'log4js';
import * as fs from 'fs';
import * as path from 'path';
const del = require('del');

const logdir = path.join(__dirname, '../log-caches');

@Suite()
export class ServerBootTest {

    private ctx!: ApplicationContext;
    private logfile!: string;
    @Before()
    async init() {
        await del(logdir);
        this.ctx = await Application.run({
            module: ServerMainModule,
            providers: [
                { provide: PROCESS_ROOT, useValue: __dirname },
                { provide: LogConfigure, useValue: logConfig }
            ]
        });
        const now = new Date();
        this.logfile = path.join(this.ctx.baseURL, `../log-caches/focas.-${formatDate(now).replace(/(-|\/)/g, '')}.log`);
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
        let defer = lang.defer();
        setTimeout(() => {
            expect(fs.existsSync(this.logfile)).toBeTruthy();
            const content = fs.readFileSync(this.logfile, 'utf-8');
            expect(isString(content)).toBeTruthy();
            expect(content.indexOf(msg)).toBeGreaterThan(0);
            defer.resolve();
        }, 10);
        await defer.promise;
    }



    @After()
    async after() {
        this.ctx.destroy();
        await del(logdir);
    }
}