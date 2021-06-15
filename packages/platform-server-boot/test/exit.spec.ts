import { ApplicationContext, BootApplication, DIModule } from '@tsdi/boot';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import { Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');


@DIModule({
    baseURL: __dirname,
    imports: [
        ServerBootstrapModule
    ]
})
class MainModule { }


@Suite()
export class ProcessExitTest {

    private ctx: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await BootApplication.run(MainModule);
    }


    @Test()
    baseurl() {
        expect(this.ctx.baseURL).toEqual(__dirname)
    }

    @Test()
    exit() {
        let val;
        this.ctx.onDestroy(()=> {
            console.log('SIGINT EXIT');
            // expect(val).toEqual('SIGINT EXIT');
        });
        setTimeout(()=> {
            process.emit('SIGINT', 'SIGINT');
        }, 100)
    }



}