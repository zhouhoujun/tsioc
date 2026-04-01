import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application, formatDate } from '@tsdi/core';
import { ComponentsModule, ComponentRef } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { ExampleComponent } from './app';
import { HtmlTemplateModule } from '../src';

@Suite('HTML Component Test')
export class CTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ExampleComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule
            ],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                        return dom.window.document;
                    }
                }
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
        
        const root = appcomRef.hostView.rootNodes[0] as any;
        const countP = root.querySelector('p');
        const buttons = root.querySelectorAll('button');
        
        expect(countP?.textContent).toEqual('Count: 0');
        buttons[0].click();

        await Promise.resolve();

        expect(countP?.textContent).toEqual('Count: 1');

        buttons[0].click();

        await Promise.resolve();
        expect(countP?.textContent).toEqual('Count: 2');
    }

    @Test('can bind event with args')
    async test3() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');
        expect(appcomRef.instance.value).toEqual('test');

        expect(appcomRef.instance.item.checked).toBeFalsy();
        
        const root = appcomRef.hostView.rootNodes[0] as any;
        const buttons = root.querySelectorAll('button');
        buttons[1].click();

        await Promise.resolve();

        expect(appcomRef.instance.item.checked).toBeTruthy();
    }

    @Test('refresh app component by mapping')
    async refreshbyMapping() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');
        expect(appcomRef.instance.value).toEqual('test');
        
        const root = appcomRef.hostView.rootNodes[0] as any;
        const valueP = root.querySelectorAll('p')[1];
        const input = root.querySelector('input');
        
        expect(valueP?.textContent).toEqual('Value: test');
        expect(input?.getAttribute('value')).toEqual('test');
        appcomRef.instance.value = 'test1';
        await Promise.resolve();

        expect(valueP?.textContent).toEqual('Value: test1');
        expect(input?.getAttribute('value')).toEqual('test1');
    }

    @Test('can refresh text with pipe')
    async test4() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');

        const root = appcomRef.hostView.rootNodes[0] as any;
        const dateP = root.querySelectorAll('p')[2];

        expect(dateP?.textContent).toEqual('Today: 2023-01-01');

        appcomRef.instance.today = new Date();

        await Promise.resolve();

        expect(dateP?.textContent).toEqual('Today: ' + formatDate(appcomRef.instance.today, 'yyyy-MM-dd'));

    }


    @After()
    async afterClean() {
        await this.ctx.close();
    }

}