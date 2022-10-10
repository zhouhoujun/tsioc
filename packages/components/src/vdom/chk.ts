import { isArray } from '@tsdi/ioc';
import { LContainer, TYPE } from './interfaces/container';
import { INode } from './interfaces/dom';
import { LView } from './interfaces/view';

/**
 * True if `value` is `LView`.
 * @param value wrapped value of `INode`, `LView`, `LContainer`
 */
 export function isLView(value: INode | LView | LContainer | {} | null): value is LView {
    return isArray(value) &&  typeof value[TYPE] === 'object';
}

/**
 * True if `value` is `LContainer`.
 * @param value wrapped value of `INode`, `LView`, `LContainer`
 */
export function isLContainer(value: INode | LView | LContainer | {} | null): value is LContainer {
    return isArray(value) && value[TYPE]  === true;
}
