import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { ServerModule } from '../src';


@Module({
    // baseURL: __dirname,
    imports: [
        ServerModule
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
        this.ctx.onDestroy(()=> {
            console.log('SIGINT EXIT');
            // expect(val).toEqual('SIGINT EXIT');
        });
        setTimeout(()=> {
            process.emit('SIGINT', 'SIGINT');
        }, 100)
    }



}