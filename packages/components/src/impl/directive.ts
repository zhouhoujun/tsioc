import {
    AbstractInvocationFactory, ClassRef, createInjector, Injectable,
    Injector, Runtime, AbstractType, InvokeOptions, RunContext,
    createRunContext, InjectUtil
} from '@tsdi/ioc';
import { ReactiveEffect } from '../effect';
import { DirectiveOptions, DirectiveDef, DirectiveFactory, DirectiveRef } from '../refs/directive';
import { reactive } from '../reactive';
import { OnDestroy } from '../lifecycle';
import { ElementRef } from '../refs/element';
import { EnvironmentContext } from '../refs/environment';

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
        const instance = super.createInstance(context ?? createRunContext(this.injector).setPayload(this._elementRef));
        const def = this.classRef.getAnnotation<DirectiveDef>();
        return reactive(instance, this.injector.get(ReactiveEffect), def.computeds);
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
            injector = createInjector(injector, options?.providers);
            InjectUtil.use(injector, def.imports);
        }
        return injector;
    }

    protected override createInjector<T>(typeRef: ClassRef<T>, injector: Injector, options: DirectiveOptions): EnvironmentContext {
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
