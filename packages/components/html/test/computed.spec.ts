import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { FieldComponet } from './app';
import { HtmlTemplateModule } from '../src';

@Suite('HTML Computed Properties Test')
export class ComputedTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(FieldComponet, {
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

    @Test('should test computed properties in FieldComponet')
    async testComputedProperties() {
        const fieldRef = this.ctx.runners.getRef(FieldComponet) as ComponentRef<FieldComponet>;
        const fieldComponent = fieldRef.instance;

        expect(fieldComponent).toBeDefined();
        expect(fieldComponent.fullName).toEqual('zhangsan (admin)');
        expect(fieldComponent.fullName1).toEqual('zhangsan admin');

        const fullName1 = fieldComponent.fullName;
        const fullName2 = fieldComponent.fullName;
        expect(fullName1).toBe(fullName2);

        fieldComponent.user = 'lisi';
        expect(fieldComponent.fullName).toEqual('lisi (admin)');
    }

    @Test('should update computed when dependency changes')
    async testComputedDependencyChange() {
        const fieldRef = this.ctx.runners.getRef(FieldComponet) as ComponentRef<FieldComponet>;
        const fieldComponent = fieldRef.instance;

        const currentFullName = fieldComponent.fullName;
        expect(currentFullName).toBeDefined();

        fieldComponent.role = 'user';
        expect(fieldComponent.fullName).toContain('user');

        fieldComponent.user = 'testuser';
        fieldComponent.role = 'testrole';
        expect(fieldComponent.fullName).toEqual('testuser (testrole)');
    }

    @Test('should test computed with cache')
    async testComputedCache() {
        const fieldRef = this.ctx.runners.getRef(FieldComponet) as ComponentRef<FieldComponet>;
        const fieldComponent = fieldRef.instance;

        const fullName1First = fieldComponent.fullName;
        const fullName1Second = fieldComponent.fullName;
        expect(fullName1First).toBe(fullName1Second);

        const fullName2First = fieldComponent.fullName1;
        const fullName2Second = fieldComponent.fullName1;
        expect(fullName2First).toBe(fullName2Second);
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }

}