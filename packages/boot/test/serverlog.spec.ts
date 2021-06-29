import { ApplicationContext, BootApplication } from "@tsdi/boot";
import { Before, Suite, Test } from "@tsdi/unit";
import expect = require("expect");
import { ServerMainModule, configurtion } from "./demo";
import { ConfigureLoggerManager } from "@tsdi/logs";

@Suite()
export class ServerBootTest {

    private ctx: ApplicationContext;
    @Before()
    async init() {
        this.ctx = await BootApplication.run({ type: ServerMainModule, configures:[configurtion]})
    }

    @Test()
    isLog4js(){
        const cfg = this.ctx.getConfiguration();
        expect(cfg.logConfig).toBeDefined();
        const loggerMgr = this.ctx.getLogManager();
        expect(loggerMgr).toBeInstanceOf(ConfigureLoggerManager);
        const logger = loggerMgr.getLogger();
        console.log(logger);
        expect(logger).toBeDefined();
    }
}