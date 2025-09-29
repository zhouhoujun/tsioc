import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application, formatDate } from '@tsdi/core';
import { ComponentsModule, ComponentRef } from '@tsdi/components';
import { ComplexComponent, FieldComponet } from './app';
import { XmlTemplateModule } from '../src';

@Suite('XML computed Test')
export class CTest {

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



    @After()
    async afterClean() {
        await this.ctx.close();
    }

}