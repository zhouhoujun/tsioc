import expect = require('expect');
import { Before, Suite, Test } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ExampleComponent } from './app';
import { ComponentsModule } from '../src';
import { JsonTemplateModule } from '../src/impl/json';



@Suite('component test')
export class CTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ExampleComponent, {
            deps: [
                JsonTemplateModule,
                ComponentsModule
            ]
        });
    }

    @Test('can bind bootsrap component')
    async test1() {
        expect(this.ctx.runners.size).toEqual(1);
        // const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        // expect(appcomRef.instance instanceof ExampleComponent).toBeTruthy();
        // expect(appcomRef.instance.value).toEqual('test');
        // expect(appcomRef.instance.count).toEqual(0);
    }

    // @Test('can bind bootsrap component')
    // async test2() {
    //     const appcomRef = await this.ctx.bootstrap(Components) as ReflectiveRef<Components>;
    //     expect(appcomRef.getInstance() instanceof AppComponent).toBeTruthy();
    //     appcomRef.getInstance().name = 'name';
    //     expect(appcomRef.getInstance().name).toEqual('name');
    //     expect(appcomRef.getInstance().se1.nativeElement.name).toEqual('name');
    // }

    // @Test('refresh app component by mapping')
    // async refreshbyMapping() {
    //     const appcomRef = this.ctx.runners.bootstraps[0] as ComponentRunnableRef<AppComponent>;
    //     expect(appcomRef.instance.label).toEqual('good');
    //     expect(appcomRef.instance.value).toEqual('xxx');
    //     expect(appcomRef.instance.cmp1.label).toEqual('good');
    //     expect(appcomRef.instance.cmp1.value).toEqual('xxx');
    // }

}
