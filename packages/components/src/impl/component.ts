import { Class, DefaultReflectiveRef, Injector, InvokeArguments } from '@tsdi/ioc';
import { ComponentRef } from '../refs/component';
import { TemplateCompiler } from '../template/compiler';
import { ComponentDef } from '../decorators/component';

export class ComponentRefImpl<T> extends DefaultReflectiveRef<T> implements ComponentRef<T> {

    readonly compiler: TemplateCompiler;

    constructor(_class: Class<T>, injector: Injector, options?: InvokeArguments<any>) {
        super(_class, injector, options);
        this.compiler = this.getContext().get(TemplateCompiler);
    }


    async render(): Promise<void> {
        const compiler = this.compiler;
        const def = this.class.getAnnotation<ComponentDef>();
        const template = def.template || await fetchTemplate(def.templateUrl!);
        this.compiler.compile(template, this);
    }

}



async function fetchTemplate(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
}


