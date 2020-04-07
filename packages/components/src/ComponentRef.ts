import { Type, isFunction, Destoryable, IDestoryable, tokenId, Injectable, Inject, Express, isBoolean } from '@tsdi/ioc';
import { IAnnoationContext, CTX_TEMPLATE,  } from '@tsdi/boot';

export const CTX_COMPONENT_DECTOR = tokenId<string>('CTX_COMPONENT_DECTOR');
export const CTX_COMPONENT = tokenId<any>('CTX_COMPONENT');
export const CTX_ELEMENT_REF = tokenId<any | any[]>('CTX_ELEMENT_REF');
export const CTX_TEMPLATE_REF = tokenId<any | any[]>('CTX_TEMPLATE_REF');
export const CTX_TEMPLATE_SCOPE = tokenId<any>('CTX_TEMPLATE_SCOPE');
export const CTX_COMPONENT_REF = tokenId<IComponentRef>('CTX_COMPONENT_REF');

export const COMPONENT_REFS = tokenId<WeakMap<any, IComponentRef<any, any>>>('COMPONENT_REFS');
export const ELEMENT_REFS = tokenId<WeakMap<any, IElementRef<any>>>('ELEMENT_REFS');


export interface IContextNode<TCtx extends IAnnoationContext = IAnnoationContext> extends IDestoryable {
    readonly context: TCtx;
}

/**
 *  element type.
 */
export interface IElement {
    destroy?();
}

export const CONTEXT_REF = tokenId<IAnnoationContext>('CONTEXT_REF');

export const ELEMENT_REF = tokenId<IElementRef>('ELEMENT_REF');

export const NATIVE_ELEMENT = tokenId<IElement>('NATIVE_ELEMENT');

export interface IElementRef<T = any, TCtx extends IAnnoationContext = IAnnoationContext> extends IContextNode<TCtx> {
    readonly nativeElement: T;
}

export interface INodeRef<T = any, TCtx extends IAnnoationContext = IAnnoationContext> extends IContextNode<TCtx> {
    readonly rootNodes: T[];
}

export const TEMPLATE_REF = tokenId<ITemplateRef>('TEMPLATE_REF');
export const ROOT_NODES = tokenId<any[]>('ROOT_NODES');

export interface ITemplateRef<T = any, TCtx extends IAnnoationContext = IAnnoationContext> extends INodeRef<T, TCtx> {
    readonly template: any;
}

export const REFCHILD_SELECTOR = tokenId<string>('REFCHILD_SELECTOR');
export const COMPONENT_REF = tokenId<IComponentRef>('COMPONENT_REF');
export const COMPONENT_TYPE = tokenId<Type>('COMPONENT_TYPE');
export const COMPONENT_INST = tokenId<object>('COMPONENT_INST');

export interface IComponentRef<T = any, TN = NodeType, TCtx extends IAnnoationContext = IAnnoationContext> extends IContextNode<TCtx> {
    readonly componentType: Type<T>;
    readonly instance: T;
    readonly selector: string;
    readonly nodeRef: ITemplateRef<TN>;
}

export type NodeType = IElement | IElementRef | INodeRef | ITemplateRef | IComponentRef;


