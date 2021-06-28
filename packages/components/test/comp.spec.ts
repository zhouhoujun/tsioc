import expect = require('expect');
import { Before, Suite, Test } from '@tsdi/unit';
import { ApplicationContext, BootApplication } from '@tsdi/boot';
import { ComponentRef } from '@tsdi/components';
import { AppComponent, TestModule } from './tmd';



@Suite('component test')
export class CTest {

    ctx: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await BootApplication.run(TestModule);
    }

    @Test('can bind bootsrap component')
    async test1() {
        expect(this.ctx.bootstraps.length).toEqual(1);
        const appcomRef = this.ctx.bootstraps[0] as ComponentRef<AppComponent>;
        expect(appcomRef.instance instanceof AppComponent).toBeTruthy();
        expect(appcomRef.instance.label).toEqual('name');
        expect(appcomRef.instance.cmp1.label).toEqual('name');
    }

    @Test('refresh app component by mapping')
    async refreshbyMapping(){
        const appcomRef = this.ctx.bootstraps[0] as ComponentRef<AppComponent>;
        await this.ctx.getMessager().send({url: '/getData', method: 'post', body: {lable: 'good', value: 'xxx'} });
        expect(appcomRef.instance.label).toEqual('good');
        expect(appcomRef.instance.value).toEqual('xxx');
        expect(appcomRef.instance.cmp1.label).toEqual('good');
        expect(appcomRef.instance.cmp1.value).toEqual('xxx');
    }

}
