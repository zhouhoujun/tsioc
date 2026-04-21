import { AbstractInvocationFactory, ClassRef, Injector, Runtime, AbstractType, Provider, InvokeOptions, RunContext } from '@tsdi/ioc';
import { ComponentOptions, ComponentRef, ComponentFactory } from '../refs/component';
import { NodeInjector } from '../refs/injector';
import { EmbeddedViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { RNode } from '../renderer/Node';
export declare class ComponentRefImpl<T> extends ComponentRef<T> {
    private _hostView?;
    private _elementRef?;
    constructor(_classRef: ClassRef<T>, context: NodeInjector, options?: ComponentOptions);
    get elementRef(): ElementRef<any>;
    get hostView(): EmbeddedViewRef<T>;
    private _inst?;
    get instance(): T;
    render(options?: {
        host?: RNode;
    }): Promise<void>;
    protected clean(): void;
    protected process(option?: NodeInjector | InvokeOptions, resolveCtx?: RunContext): Promise<void>;
    protected createInstance(context?: RunContext): T;
}
export declare class ComponentFactoryImpl extends AbstractInvocationFactory<ComponentOptions> implements ComponentFactory<ComponentOptions> {
    constructor(runtime: Runtime);
    protected getInjector<T>(typeRef: ClassRef<T>, options?: ComponentOptions): Injector;
    protected createInstance<T>(typeRef: ClassRef<T>, context: NodeInjector, options?: ComponentOptions): ComponentRef<T>;
    protected mergeProviders<T>(typeRef: ClassRef<T>, options?: ComponentOptions): Provider[];
    protected createInjector<T>(typeRef: ClassRef<T>, injector: NodeInjector, options: ComponentOptions): NodeInjector;
    create<T>(type: AbstractType<T> | ClassRef<T>, options?: ComponentOptions): ComponentRef<T>;
}
