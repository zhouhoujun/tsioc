import expect = require('expect');
import { Before, Suite, Test } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ExampleComponent } from './app';
import { ComponentsModule } from '../src';
import { JsonTemplateModule } from '../src/impl/json';
import { XmlTemplateModule } from '../src/impl/xml';
import { ComponentRef } from '../src/refs/component';
import { lang } from '@tsdi/ioc';



@Suite('component test')
export class CTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ExampleComponent, {
            deps: [
                // JsonTemplateModule,
                XmlTemplateModule,
                ComponentsModule
            ]
        });
    }

    @Test('can bind bootsrap component')
    async test1() {
        expect(this.ctx.runners.size).toEqual(1);
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance instanceof ExampleComponent).toBeTruthy();
        expect(appcomRef.instance.value).toEqual('test');
        expect(appcomRef.instance.count).toEqual(0);
    }

    @Test('can bind event component')
    async test2() {
         const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');
        expect(appcomRef.instance.value).toEqual('test');
        expect(appcomRef.hostView.rootNodes[0].childNodes[0].childNodes[1].textContent).toEqual('Count: 0');
        appcomRef.hostView.rootNodes[0].childNodes[0].childNodes[4].events.emit('click');

        await Promise.resolve();
        
        expect(appcomRef.hostView.rootNodes[0].childNodes[0].childNodes[1].textContent).toEqual('Count: 1');
    }

    @Test('refresh app component by mapping')
    async refreshbyMapping() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');
        expect(appcomRef.instance.value).toEqual('test');
        expect(appcomRef.hostView.rootNodes[0].childNodes[0].childNodes[2].textContent).toEqual('Value: test');
        expect(appcomRef.hostView.rootNodes[0].childNodes[0].childNodes[3].getAttribute('value')).toEqual('test');
        appcomRef.instance.value = 'test1';
        await Promise.resolve();
        
        expect(appcomRef.hostView.rootNodes[0].childNodes[0].childNodes[2].textContent).toEqual('Value: test1');
        expect(appcomRef.hostView.rootNodes[0].childNodes[0].childNodes[3].getAttribute('value')).toEqual('test1');
    }

}
