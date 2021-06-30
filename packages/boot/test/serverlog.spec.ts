import { BootContext, BootApplication } from "@tsdi/boot";
import { After, Before, Suite, Test } from "@tsdi/unit";
import expect = require("expect");
import { ServerMainModule, configurtion } from "./demo";
import { ConfigureLoggerManager } from "@tsdi/logs";
import * as log4js from 'log4js';
import * as fs from 'fs';
import * as path from 'path';
const del = require('del');
import { Defer, isString, lang } from "@tsdi/ioc";

const logdir = path.join(__dirname, '../log-caches')
export function formatDate(date: Date, fmt: string = 'yyyy-MM-dd'){
    var o = {
        "M+": date.getMonth() + 1, //月份
        "d+": date.getDate(), //日
        "h+": date.getHours(), //小时
        "m+": date.getMinutes(), //分
        "s+": date.getSeconds(), //秒
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度
        "S": date.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

@Suite()
export class ServerBootTest {

    private ctx: BootContext;
    private logfile: string;
    @Before()
    async init() {
        await del(logdir);
        this.ctx = await BootApplication.run({ type: ServerMainModule, configures: [configurtion] });
        const now = new Date();
        this.logfile = path.join(this.ctx.baseURL, `/log-caches/focas.-${formatDate(now).replace(/(-|\/)/g, '')}.log`);
    }

    @Test()
    isLog4js() {
        const cfg = this.ctx.getConfiguration();
        expect(cfg.logConfig).toBeDefined();
        const loggerMgr = this.ctx.getLogManager();
        expect(loggerMgr).toBeInstanceOf(ConfigureLoggerManager);
        const logger = loggerMgr.getLogger();
        expect(logger).toBeDefined();
        expect((logger as log4js.Logger).category).toEqual('default');
    }


    @Test()
    async canWriteLogFile() {
        const msg = 'log file test';
        this.ctx.getLogManager().getLogger().info(msg);
        let defer = new Defer();
        setTimeout(() => {
        expect(fs.existsSync(this.logfile)).toBeTruthy();
            const content = fs.readFileSync(this.logfile, 'utf-8');
            expect(isString(content)).toBeTruthy();
            // console.log(content);
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