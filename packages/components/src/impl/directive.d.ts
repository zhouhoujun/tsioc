import { AbstractInvocationFactory, ClassRef, Injector, Runtime, AbstractType, InvokeOptions, RunContext } from '@tsdi/ioc';
import { DirectiveOptions, DirectiveFactory, DirectiveRef } from '../refs/directive';
import { ElementRef } from '../refs/element';
import { NodeInjector } from '../refs/injector';
export declare class DirectiveRefImpl<T> extends DirectiveRef<T> {
    private _elementRef;
    constructor(_classRef: ClassRef<T>, context: NodeInjector, options: DirectiveOptions);
    get elementRef(): ElementRef;
    private _inst?;
    get instance(): T;
    protected clean(): void;
    protected process(option?: NodeInjector | InvokeOptions, resolveCtx?: RunContext): void;
    protected createInstance(context?: RunContext): T;
}
export declare class DirectiveFactoryImpl extends AbstractInvocationFactory<DirectiveOptions> implements DirectiveFactory<DirectiveOptions> {
    constructor(runtime: Runtime);
    protected getInjector<T>(typeRef: ClassRef<T>, options: DirectiveOptions): Injector;
    protected createInjector<T>(typeRef: ClassRef<T>, injector: Injector, options: DirectiveOptions): NodeInjector;
    protected createInstance<T>(typeRef: ClassRef<T>, context: NodeInjector, options: DirectiveOptions): DirectiveRef<T>;
    create<T>(type: AbstractType<T> | ClassRef<T>, options: DirectiveOptions): DirectiveRef<T>;
}
