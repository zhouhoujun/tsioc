
import { Application, ApplicationContext, Module } from '@tsdi/core';
import { ServerBootstrapModule } from '../src';
import { Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');


@Module({
    // baseURL: __dirname,
    imports: [
        ServerBootstrapModule
    ]
})
class MainModule { }


@Suite()
export class ProcessExitTest {

    private ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(MainModule);
    }


    @Test()
    baseurl() {
        expect(this.ctx.baseURL).toEqual(__dirname.slice(0, __dirname.lastIndexOf('/')))
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