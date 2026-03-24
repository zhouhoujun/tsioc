import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application, formatDate } from '@tsdi/core';
import { ComponentsModule, ComponentRef } from '@tsdi/components';
import { ExampleComponent  } from './app';
import { XmlTemplateModule } from '../src';

@Suite('XML Component Test')
export class CTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ExampleComponent, {
            deps: [
                XmlTemplateModule,
                ComponentsModule
            ]
        });
    }



    @Test('can bind bootstrap component')
    async test1() {
        expect(this.ctx.runners.size).toEqual(1);
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance instanceof ExampleComponent).toBeTruthy();
        expect(appcomRef.instance.value).toEqual('test');
        expect(appcomRef.instance.count).toEqual(0);
    }

    @Test('can bind event')
    async test2() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');
        expect(appcomRef.instance.value).toEqual('test');
        expect(appcomRef.hostView.rootNodes[0].childNodes[1].childNodes[0].textContent).toEqual('Count: 0');
        appcomRef.hostView.rootNodes[0].childNodes[4].events.emit('click');

        await Promise.resolve();

        expect(appcomRef.hostView.rootNodes[0].childNodes[1].childNodes[0].textContent).toEqual('Count: 1');

        appcomRef.hostView.rootNodes[0].childNodes[4].events.emit('click');

        await Promise.resolve();
        expect(appcomRef.hostView.rootNodes[0].childNodes[1].childNodes[0].textContent).toEqual('Count: 2');
    }

    @Test('can bind event with args')
    async test3() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');
        expect(appcomRef.instance.value).toEqual('test');

        expect(appcomRef.instance.item.checked).toBeFalsy();
        appcomRef.hostView.rootNodes[0].childNodes[5].events.emit('click');

        await Promise.resolve();

        expect(appcomRef.instance.item.checked).toBeTruthy();
    }

    @Test('refresh app component by mapping')
    async refreshbyMapping() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');
        expect(appcomRef.instance.value).toEqual('test');
        expect(appcomRef.hostView.rootNodes[0].childNodes[3].childNodes[0].textContent).toEqual('Value: test');
        expect(appcomRef.hostView.rootNodes[0].childNodes[2].getAttribute('value')).toEqual('test');
        appcomRef.instance.value = 'test1';
        await Promise.resolve();

        expect(appcomRef.hostView.rootNodes[0].childNodes[3].childNodes[0].textContent).toEqual('Value: test1');
        expect(appcomRef.hostView.rootNodes[0].childNodes[2].getAttribute('value')).toEqual('test1');
    }

    @Test('can refresh text with pipe')
    async test4() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');

        expect(appcomRef.hostView.rootNodes[0].childNodes[6].childNodes[0].textContent).toEqual('Today: 2023-01-01');

        appcomRef.instance.today = new Date();

        await Promise.resolve();

        expect(appcomRef.hostView.rootNodes[0].childNodes[6].childNodes[0].textContent).toEqual('Today: ' + formatDate(appcomRef.instance.today, 'yyyy-MM-dd'));

    }


    @After()
    async afterClean() {
        await this.ctx.close();
    }

}