import expect = require('expect');
import { Before, Suite, Test } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentRef, ComponentRunnableRef } from '@tsdi/components';
import { AppComponent, Components, TestModule } from './tmd';



@Suite('component test')
export class CTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TestModule);
    }

    @Test('can bind bootsrap component')
    async test1() {
        expect(this.ctx.runners.bootstraps.length).toEqual(1);
        const appcomRef = this.ctx.runners.bootstraps[0] as ComponentRunnableRef<AppComponent>;
        expect(appcomRef.instance instanceof AppComponent).toBeTruthy();
        expect(appcomRef.instance.label).toEqual('name');
        expect(appcomRef.instance.cmp1.label).toEqual('name');
    }

    @Test('can bind bootsrap component')
    async test2() {
        const appcomRef = this.ctx.bootstrap(Components) as ComponentRunnableRef<Components>;
        expect(appcomRef.instance instanceof AppComponent).toBeTruthy();
        appcomRef.instance.name = 'name';
        expect(appcomRef.instance.name).toEqual('name');
        expect(appcomRef.instance.se1.nativeElement.name).toEqual('name');
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
