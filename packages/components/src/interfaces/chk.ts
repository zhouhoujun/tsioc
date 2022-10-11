import { isArray } from '@tsdi/ioc';
import { ComponentDef, DirectiveDef } from '../type';
import { LContainer, TYPE } from './container';
import { INode } from './dom';
import { TNode, TNodeFlags } from './node';
import { FLAGS, LView, LViewFlags } from './view';

/**
 * True if `value` is `LView`.
 * @param value wrapped value of `INode`, `LView`, `LContainer`
 */
export function isLView(value: INode | LView | LContainer | {} | null): value is LView {
    return isArray(value) && typeof value[TYPE] === 'object';
}

/**
 * True if `value` is `LContainer`.
 * @param value wrapped value of `INode`, `LView`, `LContainer`
 */
export function isLContainer(value: INode | LView | LContainer | {} | null): value is LContainer {
    return isArray(value) && value[TYPE] === true;
}

export function isContentQueryHost(tNode: TNode): boolean {
    return (tNode.flags & TNodeFlags.hasContentQuery) !== 0;
}

export function isComponentHost(tNode: TNode): boolean {
    return (tNode.flags & TNodeFlags.isComponentHost) === TNodeFlags.isComponentHost;
}

export function isDirectiveHost(tNode: TNode): boolean {
    return (tNode.flags & TNodeFlags.isDirectiveHost) === TNodeFlags.isDirectiveHost;
}

export function isComponentDef<T>(def: DirectiveDef<T>): def is ComponentDef<T> {
    return (def as ComponentDef<T>).template !== null;
}

export function isRootView(target: LView): boolean {
    return (target[FLAGS] & LViewFlags.IsRoot) !== 0;
}