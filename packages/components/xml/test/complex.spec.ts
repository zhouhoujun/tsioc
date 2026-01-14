import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application, formatDate } from '@tsdi/core';
import { ComponentsModule, ComponentRef, ElementRef } from '@tsdi/components';
import { ComplexComponent, FieldComponet } from './app';
import { XmlTemplateModule } from '../src';

@Suite('XML computed Test')
export class ComplexTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ComplexComponent, {
            deps: [
                XmlTemplateModule,
                ComponentsModule
            ]
        });
    }



    @Test('should test computed properties in ComplexComponent')
    async testComputedProperties() {
        // 创建FieldComponent实例
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const fieldComponentRef = complexRef.hostView.query(FieldComponet);
        expect(fieldComponentRef).toBeInstanceOf(ComponentRef);
        const fieldComponent = fieldComponentRef?.instance;

        expect(fieldComponent).toBeDefined();
        expect(fieldComponent!.fullName).toEqual('zhangsan (admin)');
        expect(fieldComponent!.fullName1).toEqual('zhangsan admin');

        // 测试计算属性缓存
        const fullName1 = fieldComponent!.fullName;
        const fullName2 = fieldComponent!.fullName;
        expect(fullName1).toBe(fullName2);

        // 修改依赖属性后验证计算属性更新
        fieldComponent!.user = 'lisi';
        expect(fieldComponent!.fullName).toEqual('lisi (admin)');
    }

    @Test('should v-for contians 4 items in ComplexComponent')
    async testVFor() {
        // 创建FieldComponent实例
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const elementRef = complexRef.hostView.query('.dynamic-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();
        expect(elementRef.nativeElement.childNodes.length).toEqual(4);
        
        expect(elementRef.nativeElement.childNodes[1].childNodes[0].textContent).toEqual('Item 2: Value 2');
    }


    @Test('should v-if in ComplexComponent')
    async testVif() {
        // 创建FieldComponent实例
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const elementRef = complexRef.hostView.query('.conditional-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();
        expect(elementRef.nativeElement.childNodes.length).toEqual(2);
        
        expect(elementRef.nativeElement.childNodes[0].childNodes[0].textContent).toEqual('This is conditional content');
    }


    @Test('should v-switch in ComplexComponent')
    async testSwitch() {
        // 创建FieldComponent实例
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const elementRef = complexRef.hostView.query('.switch-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();
        expect(elementRef.nativeElement.childNodes.length).toEqual(3);
        
        expect(elementRef.nativeElement.childNodes[0].childNodes[0].textContent).toEqual('This is case 1 content');
    }


    @After()
    async afterClean() {
        await this.ctx.close();
    }

}