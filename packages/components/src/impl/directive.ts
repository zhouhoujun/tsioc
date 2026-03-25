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
import { NodeInjector } from '../refs/injector';

export class DirectiveRefImpl<T> extends DirectiveRef<T> {

    private _elementRef: ElementRef;
    constructor(
        _classRef: ClassRef<T>,
        context: NodeInjector,
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

    protected process(option?: NodeInjector | InvokeOptions, resolveCtx?: RunContext) {

    }

    protected override createInstance(context?: RunContext): T {
        const ctx = context ?? createRunContext(this.injector);
        ctx.setInjector(this.injector);
        ctx.setPayload(this._elementRef);
        const instance = super.createInstance(ctx);
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

    protected override createInjector<T>(typeRef: ClassRef<T>, injector: Injector, options: DirectiveOptions): NodeInjector {
        // console.log('[DirectiveFactoryImpl] createInjector options:', options, 'elementRef:', options?.elementRef);
        const context = new NodeInjector(injector, options);
        if (options.elementRef) {
            context.setPayload(options.elementRef);
            // console.log('[DirectiveFactoryImpl] Payload set');
        } else {
            // console.log('[DirectiveFactoryImpl] No elementRef in options');
        }
        // if (!context.has(ReactiveEffect, InjectFlags.Self)) {
        //     context.setValue(ReactiveEffect, new DefaultReactiveEffect(options))
        // }
        return context;
    }

    protected override createInstance<T>(typeRef: ClassRef<T>, context: NodeInjector, options: DirectiveOptions): DirectiveRef<T> {
        return new DirectiveRefImpl(typeRef, context, options);
    }


    override create<T>(type: AbstractType<T> | ClassRef<T>, options: DirectiveOptions): DirectiveRef<T> {
        return super.create(type, options) as DirectiveRef<T>;
    }

}
