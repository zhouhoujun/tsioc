import {
    AbstractInvocationFactory, ClassRef, createInjector, Exception, Injectable,
    Injector, InvocationContext, Platform, AbstractType, Provider, toProvider, Type
} from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentOptions, ComponentRef, ComponentFactory, ComponentDef } from '../refs/component';
import { TemplateCompiler } from '../template/compiler';
import { reactive } from './reactive';
import { AfterViewInit, OnInit, OnDestroy } from '../lifecycle';
import { createEmbeddedViewRef } from './view';
import { EnvironmentContext } from '../refs/environment';
import { EmbeddedViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';


export class ComponentRefImpl<T> extends ComponentRef<T> {
  

    private _hostView?: EmbeddedViewRef<T>;
    private _elementRef?: ElementRef<any>;
    constructor(
        _classRef: ClassRef<T>,
        context: EnvironmentContext,
        options?: ComponentOptions) {
        super(_classRef, context, options);
        this._elementRef = options?.elementRef;
    }

    get elementRef(): ElementRef<any> {
        return this._elementRef!;    
    }

    get hostView(): EmbeddedViewRef<T> {
        return this._hostView!;
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
        this._hostView = await compiler.compile(template, this.instance, this.context);
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

    protected override createInstance<T>(typeRef: ClassRef<T>, context: EnvironmentContext, options?: ComponentOptions): ComponentRef<T> {

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