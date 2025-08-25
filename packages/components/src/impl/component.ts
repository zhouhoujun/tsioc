import {
    AbstractInvocation, AbstractInvocationFactory, Class, createInjector, Empty, Exception, Injectable,
    Injector, InvocationContext, InvokeArguments, Platform, AbstractType, Provider, toProvider
} from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentOptions, ComponentRef, ComponentFactory } from '../refs/component';
import { ViewRef } from '../refs/view';
import { TemplateCompiler } from '../template/compiler';
import { ComponentDef } from '../decorators/component';
import { reactive } from './reactive';


export class ComponentRefImpl<T, TOpts extends ComponentOptions = ComponentOptions> extends AbstractInvocation<T, TOpts> implements ComponentRef<T> {

    private _hostView?: ViewRef;
    constructor(
        _class: Class<T>,
        context: InvocationContext,
        options?: TOpts) {
        super(_class, context, options);
    }

    get hostView(): ViewRef {
        return this._hostView!;
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
        if (!/\[\w+\]/.test(def.selector || '') && !def.template && !def.templateUrl) throw new Exception(this.class.className + ' template or templateUrl is required.')
        const template = def.template || await fetchTemplate(def.templateUrl!);
        if (option) {
            this.context.attach(option);
        }
        const compiler = this.context.get(TemplateCompiler);
        this._hostView = compiler.compile(template, this);

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

    constructor(
        platform: Platform
    ) {
        super(platform);
    }

    protected override getInjector<T>(typeRef: Class<T>, options?: ComponentOptions): Injector {
        let injector = super.getInjector(typeRef, options);
        // 注入Renderer
        const def = typeRef.getAnnotation<ComponentDef>();
        if (def.imports?.length) {
            injector = createInjector(Empty, injector);
            injector.use(def.imports);
        }
        return injector;
    }

    protected override createInstance<T>(typeRef: Class<T>, context: InvocationContext, options?: ComponentOptions): ComponentRef<T> {
        return new ComponentRefImpl(typeRef, context, options);
    }

    protected override normalize(providers: Provider[], options?: ComponentOptions) {
        if (options?.compiler) {
            providers.push(toProvider(TemplateCompiler, options.compiler));
        }
    }

    override create<T>(type: AbstractType<T> | Class<T>, options?: ComponentOptions): ComponentRef<T> {
        return super.create(type, options) as ComponentRef<T>;
    }

}


async function fetchTemplate(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
}