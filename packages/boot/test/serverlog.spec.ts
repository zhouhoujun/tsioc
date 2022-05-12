import { BootApplicationContext, BootApplication } from '../src';
import { After, Before, Suite, Test } from '@tsdi/unit';
import { ConfigureLoggerManager, ILogger } from '@tsdi/logs';
import expect = require('expect');
import { ServerMainModule, configurtion } from './demo';
import * as log4js from 'log4js';
import * as fs from 'node:fs';
import * as path from 'node:path';
const del = require('del');
import { isString, lang } from '@tsdi/ioc';
import { formatDate } from '@tsdi/core';

const logdir = path.join(__dirname, '../log-caches')

@Suite()
export class ServerBootTest {

    private ctx!: BootApplicationContext;
    private logfile!: string;
    @Before()
    async init() {
        await del(logdir);
        this.ctx = await BootApplication.run({ module: ServerMainModule, configures: [configurtion] }); //{debug: true},
        const now = new Date();
        this.logfile = path.join(this.ctx.baseURL, `/log-caches/focas.-${formatDate(now).replace(/(-|\/)/g, '')}.log`);
    }

    @Test()
    isLog4js() {
        const cfg = this.ctx.getConfiguration();
        expect(cfg.logConfig).toBeDefined();
        const logger = this.ctx.getLogger() as ILogger;
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
        await del(logdir);
    }
}