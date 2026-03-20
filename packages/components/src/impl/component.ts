import {
    AbstractInvocationFactory, ClassRef, createInjector, Exception, Injectable,
    Injector, Runtime, AbstractType, Provider, toProvider,
    InvokeOptions, RunContext, InjectFlags, createRunContext, InjectUtil
} from '@tsdi/ioc';
import { ReactiveEffect } from '../effect';
import { ComponentOptions, ComponentRef, ComponentFactory, ComponentDef } from '../refs/component';
import { TemplateCompiler } from '../template/compiler';
import { reactive } from '../reactive';
import { AfterViewInit, OnInit, OnDestroy } from '../lifecycle';
import { EnvironmentContext } from '../refs/environment';
import { EmbeddedViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { TemplateRef } from '../refs/template';
import { RNode } from '../renderer/Node';
import { DefaultReactiveEffect } from './effect';
import { DIRECTIVES } from '../decorators/directive';
import { COMPONENTS } from '../decorators/component';


export class ComponentRefImpl<T> extends ComponentRef<T> {


    private _hostView?: EmbeddedViewRef<T>;
    private _elementRef?: ElementRef<any>;
    constructor(
        _classRef: ClassRef<T>,
        context: EnvironmentContext,
        options?: ComponentOptions) {
        super(_classRef, context, options);
        this._elementRef = options?.elementRef;
        context.onDestroy(this);
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
            this._inst = this.createInstance();
        }
        return this._inst;
    }


    async render(options?: { host?: RNode }): Promise<void> {
        const def = this.classRef.getAnnotation<ComponentDef>();
        if (!/\[\w+\]/.test(def.selector || '') && !def.template && !def.templateUrl) throw new Exception(this.classRef.className + ' template or templateUrl is required.')

        await (this.instance as OnInit).onInit?.();
        const directives = this.injector.get(DIRECTIVES) || [];
        const components = this.injector.get(COMPONENTS) || [];
        if (!this._elementRef) {
            this._elementRef = this.injector.getElementRef(options?.host ?? this.injector.get(Renderer).createElement(def.selector ?? this.classRef.className));
        }
        
        if (!def.ƿtempFac) {
            const template = def.template || await fetchTemplate(def.templateUrl!);
            const compiler = this.injector.get(TemplateCompiler);
            (def as any).ƿtempFac = compiler.compile<T>(template, { directives, components });
        }
        const host = this._elementRef;
        const templateRef =  def.ƿtempFac!(host, this.injector);
        this.injector.setValue(TemplateRef, templateRef);
        this._hostView = templateRef.createEmbeddedView(this.instance, this.injector);
        await (this.instance as AfterViewInit).onAfterViewInit?.();
    }

    protected override clean(): void {
        (this.instance as OnDestroy)?.onDestroy?.();
        super.clean();
        this.hostView?.destroy();
    }

    protected override process(option?: EnvironmentContext | InvokeOptions, resolveCtx?: RunContext) {
        return this.render(this.options);
    }

    protected override createInstance(context?: RunContext): T {
        const instance = super.createInstance(context ?? createRunContext(this.injector).setPayload(this._elementRef));
        const def = this.classRef.getAnnotation<ComponentDef>();
        return reactive(instance, this.injector.get(ReactiveEffect), def.computeds);
    }

}

@Injectable()
export class ComponentFactoryImpl extends AbstractInvocationFactory<ComponentOptions> implements ComponentFactory<ComponentOptions> {

    constructor(
        runtime: Runtime
    ) {
        super(runtime);
    }

    protected override getInjector<T>(typeRef: ClassRef<T>, options?: ComponentOptions): Injector {
        let injector = super.getInjector(typeRef, options);
        // 注入Renderer
        const def = typeRef.getAnnotation<ComponentDef>();
        if (def.imports?.length) {
            injector = createInjector(options?.providers, injector);
            InjectUtil.use(injector, def.imports);
        }
        return injector;
    }

    protected override createInstance<T>(typeRef: ClassRef<T>, context: EnvironmentContext, options?: ComponentOptions): ComponentRef<T> {
        return new ComponentRefImpl(typeRef, context, options);
    }


    protected override mergeProviders<T>(typeRef: ClassRef<T>, options?: ComponentOptions): Provider[] {
        const providers = super.mergeProviders(typeRef, options);
        if (options?.compiler) {
            providers.push(toProvider(TemplateCompiler, options.compiler));
        }
        if (options?.renderer) {
            providers.push(toProvider(Renderer, options.renderer));
        }
        return providers;
    }

    protected override createInjector<T>(typeRef: ClassRef<T>, injector: EnvironmentContext, options: ComponentOptions): EnvironmentContext {
        const context = new EnvironmentContext(injector, options);
        if (!context.has(ReactiveEffect, InjectFlags.Self)) {
            context.setValue(ReactiveEffect, new DefaultReactiveEffect(options))
        }
        return context;
    }

    override create<T>(type: AbstractType<T> | ClassRef<T>, options?: ComponentOptions): ComponentRef<T> {
        return super.create(type, options) as ComponentRef<T>;
    }

}


async function fetchTemplate(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
}