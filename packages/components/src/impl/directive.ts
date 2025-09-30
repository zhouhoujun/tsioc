import {
    AbstractInvocationFactory, ClassRef, createInjector, Injectable,
    Injector, Platform, AbstractType, InvokeArguments,
    Provider
} from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { DirectiveOptions, DirectiveDef, DirectiveFactory, DirectiveRef } from '../refs/directive';
import { reactive } from './reactive';
import { OnDestroy } from '../lifecycle';
import { ElementRef } from '../refs/element';
import { EnvironmentContext } from '../refs/environment';
import { TemplateCompiler } from '../template/compiler';


export class DirectiveRefImpl<T> extends DirectiveRef<T> {

    private _elementRef: ElementRef;
    constructor(
        _classRef: ClassRef<T>,
        context: EnvironmentContext,
        options: DirectiveOptions) {
        super(_classRef, context, options);
        this._elementRef = options.elementRef!
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

    protected process(option?: EnvironmentContext | InvokeArguments, args?: any[]) {

    }

    protected override createInstance(): T {
        const instance = super.createInstance();
        return reactive(instance, this.injector.get(ReactiveEffect))
    }

}

@Injectable()
export class DirectiveFactoryImpl extends AbstractInvocationFactory<DirectiveOptions> implements DirectiveFactory<DirectiveOptions> {

    constructor(
        platform: Platform
    ) {
        super(platform);
    }

    protected override getInjector<T>(typeRef: ClassRef<T>, options: DirectiveOptions): Injector {
        let injector = super.getInjector(typeRef, options);
        // 注入Renderer
        const def = typeRef.getAnnotation<DirectiveDef>();
        if (def.imports?.length) {
            injector = createInjector(options?.providers, injector);
            injector.use(def.imports);
        }
        return injector;
    }


    protected override mergeProviders<T>(typeRef: ClassRef<T>, options?: DirectiveOptions): Provider[] {
        const providers = super.mergeProviders(typeRef, options);
        if (options?.elementRef) {
            providers.push({ provide: ElementRef, useValue: options.elementRef });
        }
        return providers;
    }

    protected override createContext<T>(typeRef: ClassRef<T>, injector: Injector, options: DirectiveOptions): EnvironmentContext {
        return new EnvironmentContext(injector, options, typeRef.type);
    }

    protected override createInstance<T>(typeRef: ClassRef<T>, context: EnvironmentContext, options: DirectiveOptions): DirectiveRef<T> {
        return new DirectiveRefImpl(typeRef, context, options);
    }


    override create<T>(type: AbstractType<T> | ClassRef<T>, options: DirectiveOptions): DirectiveRef<T> {
        return super.create(type, options) as DirectiveRef<T>;
    }

}
