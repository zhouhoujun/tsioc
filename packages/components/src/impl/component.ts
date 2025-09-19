import {
    AbstractInvocationFactory, ClassRef, createInjector, Exception, Injectable,
    Injector, InvocationContext, Platform, AbstractType, Provider, toProvider,
    Type
} from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentOptions, ComponentRef, ComponentFactory } from '../refs/component';
import { ViewRef } from '../refs/view';
import { TemplateCompiler } from '../template/compiler';
import { ComponentDef } from '../decorators/component';
import { reactive } from './reactive';
import { AfterViewInit, OnInit, OnDestroy } from '../lifecycle';
import { TemplateParser } from '../template/parser';
import { RootViewRef } from './view';


export class ComponentRefImpl<T> extends ComponentRef<T> {

    private _hostView?: RootViewRef;
    constructor(
        _classRef: ClassRef<T>,
        context: InvocationContext,
        options?: ComponentOptions) {
        super(_classRef, context, options);
    }

    get hostView(): RootViewRef {
        return this._hostView!;
    }

    query<T>(selector: string | Type<T>): T | null {
        return this.hostView.query<T>(selector);
    }
    queryAll<T>(selector: string | Type<T>): T[] {
        return this.hostView.queryAll(selector);
    }

    private _inst?: T;
    get instance(): T {
        if (!this._inst) {
            this._inst = this.createInstance()
        }
        return this._inst;
    }


    async render(): Promise<void> {
        const def = this.classRef.getAnnotation<ComponentDef>();
        if (!/\[\w+\]/.test(def.selector || '') && !def.template && !def.templateUrl) throw new Exception(this.classRef.className + ' template or templateUrl is required.')
        const template = def.template || await fetchTemplate(def.templateUrl!);
        const compiler = this.context.get(TemplateCompiler);
        await (this.instance as OnInit).onInit?.();
        this._hostView = await compiler.compile(template, this.instance, this.context) as RootViewRef;
        await (this.instance as AfterViewInit).onAfterViewInit?.();
    }

    protected override clean(): void {
        (this.instance as OnDestroy)?.onDestroy?.();
        super.clean();
        this.hostView?.destroy();
    }

    protected override process() {
        return this.render();
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

    protected override getInjector<T>(typeRef: ClassRef<T>, options?: ComponentOptions): Injector {
        let injector = super.getInjector(typeRef, options);
        // 注入Renderer
        const def = typeRef.getAnnotation<ComponentDef>();
        if (def.imports?.length) {
            injector = createInjector(options?.providers, injector);
            injector.use(def.imports);
        }
        return injector;
    }

    protected override createInstance<T>(typeRef: ClassRef<T>, context: InvocationContext, options?: ComponentOptions): ComponentRef<T> {

        return new ComponentRefImpl(typeRef, context, options);
    }

    protected override normalize(providers: Provider[], options?: ComponentOptions) {
        if (options?.compiler) {
            providers.push(toProvider(TemplateCompiler, options.compiler));
        }
    }

    override create<T>(type: AbstractType<T> | ClassRef<T>, options?: ComponentOptions): ComponentRef<T> {
        return super.create(type, options) as ComponentRef<T>;
    }

}


async function fetchTemplate(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
}