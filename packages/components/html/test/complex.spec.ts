import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, ElementRef } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { ComplexComponent, FieldComponet } from './app';
import { HtmlTemplateModule } from '../src';

@Suite('HTML Complex Component Test')
export class ComplexTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ComplexComponent, {
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

    @Test('should test computed properties in ComplexComponent')
    async testComputedProperties() {
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const fieldComponentRef = complexRef.hostView.query(FieldComponet);
        expect(fieldComponentRef).toBeInstanceOf(ComponentRef);
        const fieldComponent = fieldComponentRef?.instance;

        expect(fieldComponent).toBeDefined();
        expect(fieldComponent!.fullName).toEqual('zhangsan (admin)');
        expect(fieldComponent!.fullName1).toEqual('zhangsan admin');

        const fullName1 = fieldComponent!.fullName;
        const fullName2 = fieldComponent!.fullName;
        expect(fullName1).toBe(fullName2);

        fieldComponent!.user = 'lisi';
        expect(fieldComponent!.fullName).toEqual('lisi (admin)');
    }

    @Test('should v-for renders items in ComplexComponent')
    async testVFor() {
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const elementRef = complexRef.hostView.query('.dynamic-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();

        const root = elementRef.nativeElement;
        const paragraphs = root.querySelectorAll('p');
        expect(paragraphs.length).toBeGreaterThan(0);
    }

    @Test('should v-if toggles content in ComplexComponent')
    async testVif() {
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const elementRef = complexRef.hostView.query('.conditional-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();

        const root = elementRef.nativeElement;
        const initialP = root.querySelector('p');
        expect(initialP).toBeDefined();

        complexRef.instance.showConditional = true;
        await Promise.resolve();

        const conditionalP = root.querySelector('p');
        expect(conditionalP?.textContent).toContain('conditional content');
    }

    @Test('should v-switch shows correct case in ComplexComponent')
    async testSwitch() {
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        await Promise.resolve();

        const elementRef = complexRef.hostView.query('.switch-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();

        const root = elementRef.nativeElement;
        const caseP = root.querySelector('p');
        expect(caseP).toBeDefined();
        expect(caseP?.textContent).toContain('case');
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }

}