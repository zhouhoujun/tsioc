import { ContextInjector, InjectFlags, ResolveInterceptorFn, ResolveInterceptorLike, TargetInvokeArguments, Type } from '@tsdi/ioc';
import { ElementRef } from './element';
import { TemplateRef } from './template';
import { RNode } from '../renderer/Node';
import { DirectiveRef } from './directive';
import { ComponentRef } from './component';
import { ViewContainerRef } from './container';
import { noReact } from '../effect';
import { ViewRef } from './view';
export declare const NODES_RESOLVERS: import("@tsdi/ioc").InjectToken<ResolveInterceptorLike[]>;
export declare const nodeResolveInterceptorFactory: () => ResolveInterceptorFn;
/**
 * Node Injector - Context injector for template nodes
 */
export declare class NodeInjector extends ContextInjector {
    [noReact]: boolean;
    private _payload;
    private _allDirectiveRefs?;
    private get allDirectiveRefs();
    private getRootInjector;
    readonly componentRefs: Map<RNode, ComponentRef<any>>;
    readonly directiveRefs: Map<RNode, DirectiveRef<any>[]>;
    readonly templateRefs: Map<RNode, TemplateRef<any>>;
    readonly elementRefs: Map<RNode, ElementRef<any>>;
    readonly viewContainerRefs: Map<RNode, ViewContainerRef>;
    readonly computedCache: Map<string, {
        value: any;
        deps: Set<any>;
    }>;
    readonly parentNodes: Map<RNode, RNode>;
    protected initOptions(options: TargetInvokeArguments): void;
    setPayload(payload: any): this;
    getPayload<T = any>(): T;
    clear(): void;
    getParentInjector(): NodeInjector | null;
    attachComponent<C>(compRef: ComponentRef<C>): void;
    attachDirective<C>(dirRef: DirectiveRef<C>): void;
    attachTemplate<C>(tempRef: TemplateRef<C>): void;
    query<T>(selector: Type<T>, el: RNode | RNode[], options?: {}): ComponentRef<T> | DirectiveRef<T> | null;
    query<C>(selector: string, el: RNode | RNode[]): ElementRef<C> | ViewRef<C> | TemplateRef<C> | null;
    queryAll<T>(selector: Type<T>, el: RNode | RNode[]): Array<ComponentRef<T> | DirectiveRef<T>>;
    queryAll<C>(selector: string, el: RNode | RNode[]): Array<ElementRef<C> | ViewRef<C> | TemplateRef<C>>;
    getComponentRef<T>(componentType: Type<T>, flags?: InjectFlags): ComponentRef<T>[];
    getComponentRefByNode(node: RNode, flags?: InjectFlags): ComponentRef<any> | null;
    getDirectiveRef<T>(directorType: Type<T>, flags?: InjectFlags): DirectiveRef<T>[];
    getDirectiveRefByNode(node: RNode, flags?: InjectFlags): DirectiveRef<any> | null;
    getDirectiveRefsByNode(node: RNode, flags?: InjectFlags): DirectiveRef<any>[] | null;
    getTemplateRef<T>(node: RNode, flags?: InjectFlags): TemplateRef<T> | null;
    getElementRef<T extends RNode>(node: T, flags?: InjectFlags): ElementRef<T>;
    getViewContainerRef<T extends RNode>(nodeOrRef: T | ElementRef<T>, flags?: InjectFlags): ViewContainerRef<T>;
    protected createElementRef<T extends RNode>(node: T): ElementRef<T>;
    createViewContainerRef<T extends RNode>(node: T): ViewContainerRef<T>;
    setParentNode(node: RNode, parent: RNode): void;
    getParentNode(node: RNode): RNode | null;
}
export { NodeInjector as EnvironmentContext };
