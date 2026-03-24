import { ComplexComponent } from './test/app';
import { XmlTemplateModule } from './src';
import { ComponentsModule, ComponentRef } from '@tsdi/components';
import { Application } from '@tsdi/core';

(async () => {
    const ctx = await Application.run(ComplexComponent, {
        deps: [XmlTemplateModule, ComponentsModule]
    });

    const complexRef = ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

    console.log('\n=== Check .switch-content ===');
    const elementRef = complexRef.hostView.query('.switch-content') as any;
    console.log('result:', elementRef ? 'FOUND' : 'NOT FOUND');
    if (elementRef) {
        const el = elementRef.nativeElement;
        console.log('el.tagName:', el?.tagName);
        console.log('el.childNodes:', el?.childNodes?.length);
        el?.childNodes?.forEach((c: any, i: number) => {
            console.log(`  ${i}: tagName=${c.tagName}, v-case=${c.attributes?.get('v-case')?.value}`);
            const vcr = complexRef.hostView.injector?.viewContainerRefs?.get(c);
            console.log(`     viewContainerRef length: ${vcr?.length}`);
        });
    }

    await ctx.close();
})().catch(console.error);
