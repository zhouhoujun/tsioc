import expect = require('expect');
import { Before, Suite, Test } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentRef, ComponentRunnableRef } from '@tsdi/components';
import { AppComponent, Components, TestModule } from './tmd';
import { ReflectiveRef } from '@tsdi/ioc';



@Suite('component test')
export class CTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TestModule);
    }

    @Test('can bind bootsrap component')
    async test1() {
        expect(this.ctx.runners.size).toEqual(1);
        const appcomRef = this.ctx.runners.getRef(AppComponent) as ReflectiveRef<AppComponent>;
        expect(appcomRef.getInstance() instanceof AppComponent).toBeTruthy();
        expect(appcomRef.getInstance().label).toEqual('name');
        expect(appcomRef.getInstance().cmp1.label).toEqual('name');
    }

    @Test('can bind bootsrap component')
    async test2() {
        const appcomRef = await this.ctx.bootstrap(Components) as ReflectiveRef<Components>;
        expect(appcomRef.getInstance() instanceof AppComponent).toBeTruthy();
        appcomRef.getInstance().name = 'name';
        expect(appcomRef.getInstance().name).toEqual('name');
        expect(appcomRef.getInstance().se1.nativeElement.name).toEqual('name');
    }

    // @Test('refresh app component by mapping')
    // async refreshbyMapping() {
    //     const appcomRef = this.ctx.runners.bootstraps[0] as ComponentRunnableRef<AppComponent>;
    //     expect(appcomRef.instance.label).toEqual('good');
    //     expect(appcomRef.instance.value).toEqual('xxx');
    //     expect(appcomRef.instance.cmp1.label).toEqual('good');
    //     expect(appcomRef.instance.cmp1.value).toEqual('xxx');
    // }

}
