import { AbstractInvocation, AbstractInvocationFactory, Class, createInjector, Empty, Injectable, Injector, InvocationContext, InvokeArguments, Type } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentOptions, ComponentRef, ComponentFactory } from '../refs/component';
import { ViewRef } from '../refs/view';
import { TemplateCompiler } from '../template/compiler';
import { ComponentDef } from '../decorators/component';
import { reactive } from './reactive';

export class ComponentRefImpl<T, TOpts extends ComponentOptions = ComponentOptions> extends AbstractInvocation<T, TOpts> implements ComponentRef<T> {

    constructor(
        _class: Class<T>,
        context: InvocationContext,
        options?: TOpts) {
        super(_class, context, options);
    }


    get compiler(): TemplateCompiler {
        throw new Error('Method not implemented.');
    }


    get hostView(): ViewRef {
        throw new Error('Method not implemented.');
    }

    private _inst?: T;
    get instance(): T {
        if (!this._inst) {
            this._inst = this.createInstance()
        }
        return this._inst;
    }


    async render(option?: InvocationContext | InvokeArguments): Promise<void> {
        const def = this.class.getAnnotation<ComponentDef>();
        const template = def.template || await fetchTemplate(def.templateUrl!);
        this.compiler.compile(template, this);
    }

    protected override process(option?: InvocationContext | InvokeArguments) {
        return this.render(option);
    }

    protected override createInstance(): T {
        const instance = super.createInstance();
        return reactive(instance, this.injector.get(ReactiveEffect))
    }

}

@Injectable()
export class ComponentFactoryImpl extends AbstractInvocationFactory<ComponentOptions> implements ComponentFactory<ComponentOptions> {
    protected override createInstance<T>(typeRef: Class<T>, context: InvocationContext, options?: ComponentOptions): ComponentRef<T> {
        return new ComponentRefImpl(typeRef, context, options);
    }

    override create<T>(type: Type<T> | Class<T>, options?: ComponentOptions): ComponentRef<T> {
        return super.create(type, options) as ComponentRef<T>;
    }

    protected override getInjector<T>(typeRef: Class<T>, options?: ComponentOptions): Injector {
        let injector = super.getInjector(typeRef, options);
        const def = typeRef.getAnnotation<ComponentDef>();
        if(def.imports?.length){
            injector = createInjector(Empty, injector);
            injector.use(def.imports);
        }
        return injector;
    }
   
}


async function fetchTemplate(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
}

