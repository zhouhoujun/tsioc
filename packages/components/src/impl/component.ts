import { Class, DefaultReflectiveRef, Injector, InvokeArguments } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentRef } from '../refs/component';
import { ViewRef } from '../refs/view';
import { TemplateCompiler } from '../template/compiler';
import { ComponentDef } from '../decorators/component';
import { reactive } from './reactive';

export class ComponentRefImpl<T> extends DefaultReflectiveRef<T> implements ComponentRef<T> {

    constructor(
        _class: Class<T>,
        injector: Injector,
        readonly compiler: TemplateCompiler,
        options?: InvokeArguments<any>) {
        super(_class, injector, options);
        this.compiler = this.getContext().get(TemplateCompiler);
    }
    
    get hostView(): ViewRef {
        throw new Error('Method not implemented.');
    }
    
    get instance(): T {
        return this.getInstance()
    }


    async render(): Promise<void> {
        const def = this.class.getAnnotation<ComponentDef>();
        const template = def.template || await fetchTemplate(def.templateUrl!);
        this.compiler.compile(template, this);
    }

    protected override createInstance(): T {
        const instance = super.createInstance();
        return reactive(instance, this.injector.get(ReactiveEffect))
    }

}



async function fetchTemplate(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
}

