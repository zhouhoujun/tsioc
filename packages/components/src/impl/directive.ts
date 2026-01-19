import {
    AbstractInvocationFactory, ClassRef, createInjector, Injectable,
    Injector, Runtime, AbstractType, InvokeOptions, Provider, RunContext,
    createRunContext,
    InjectUtil
} from '@tsdi/ioc';
import { ReactiveEffect } from '../effect';
import { DirectiveOptions, DirectiveDef, DirectiveFactory, DirectiveRef } from '../refs/directive';
import { reactive } from '../reactive';
import { OnDestroy } from '../lifecycle';
import { ElementRef } from '../refs/element';
import { EnvironmentContext } from '../refs/environment';
import { ViewContainerRef } from '../refs/container';
import { TemplateRef } from '../refs/template';

export class DirectiveRefImpl<T> extends DirectiveRef<T> {

    private _elementRef: ElementRef;
    constructor(
        _classRef: ClassRef<T>,
        context: EnvironmentContext,
        options: DirectiveOptions) {
        super(_classRef, context, options);
        this._elementRef = options.elementRef!
        context.onDestroy(this);
    }

    get elementRef(): ElementRef {
        return this._elementRef!;
    }

    private _inst?: T;
    get instance(): T {
        if (!this._inst) {
            this._inst = this.createInstance()
        }
        return this._inst;
    }


    protected override clean(): void {
        (this.instance as OnDestroy)?.onDestroy?.();
        super.clean();
    }

    protected process(option?: EnvironmentContext | InvokeOptions, resolveCtx?: RunContext) {

    }

    protected override createInstance(context?: RunContext): T {
        const instance = super.createInstance(context ?? createRunContext(this.context, this._elementRef));
        const def = this.classRef.getAnnotation<DirectiveDef>();
        return reactive(instance, this.context.get(ReactiveEffect), def.computeds);
    }

}

@Injectable()
export class DirectiveFactoryImpl extends AbstractInvocationFactory<DirectiveOptions> implements DirectiveFactory<DirectiveOptions> {

    constructor(
        runtime: Runtime
    ) {
        super(runtime);
    }

    protected override getInjector<T>(typeRef: ClassRef<T>, options: DirectiveOptions): Injector {
        let injector = super.getInjector(typeRef, options);
        // 注入Renderer
        const def = typeRef.getAnnotation<DirectiveDef>();
        if (def.imports?.length) {
            injector = createInjector(options?.providers, injector);
            InjectUtil.use(injector, def.imports);
        }
        return injector;
    }


    protected override mergeProviders<T>(typeRef: ClassRef<T>, options?: DirectiveOptions): Provider[] {
        const providers = super.mergeProviders(typeRef, options);
        // if (options?.elementRef) {
        //     const elementRef = options.elementRef;
        //     providers.push({ provide: ElementRef, useValue: elementRef });
        //     providers.push({ provide: ViewContainerRef, useFactory: (ctx: EnvironmentContext) => ctx.getViewContainerRef(elementRef), deps: [EnvironmentContext] });
        //     // providers.push({ provide: TemplateRef, useFactory: (ctx: EnvironmentContext) => createTemplateRef(options.templateNodes!, elementRef, ctx), deps: [EnvironmentContext] });
        // }

        // if(options?.templateRef) {
        //     providers.push({ provide: TemplateRef, useValue: options.templateRef });
        // }

        return providers;
    }

    protected override createContext<T>(typeRef: ClassRef<T>, injector: Injector, options: DirectiveOptions): EnvironmentContext {
        const context = new EnvironmentContext(injector, options);
        // if (!context.has(ReactiveEffect, InjectFlags.Self)) {
        //     context.setValue(ReactiveEffect, new DefaultReactiveEffect(options))
        // }
        return context;
    }

    protected override createInstance<T>(typeRef: ClassRef<T>, context: EnvironmentContext, options: DirectiveOptions): DirectiveRef<T> {
        return new DirectiveRefImpl(typeRef, context, options);
    }


    override create<T>(type: AbstractType<T> | ClassRef<T>, options: DirectiveOptions): DirectiveRef<T> {
        return super.create(type, options) as DirectiveRef<T>;
    }

}
