import { areIterablesEqual, isListLikeIterable } from './iterable';


export function devModeEqual(a: any, b: any): boolean {
    const isListLikeIterableA = isListLikeIterable(a);
    const isListLikeIterableB = isListLikeIterable(b);
    if (isListLikeIterableA && isListLikeIterableB) {
        return areIterablesEqual(a, b, devModeEqual);
    } else {
        const isAObject = a && (typeof a === 'object' || typeof a === 'function');
        const isBObject = b && (typeof b === 'object' || typeof b === 'function');
        if (!isListLikeIterableA && isAObject && !isListLikeIterableB && isBObject) {
            return true;
        } else {
            return Object.is(a, b);
        }
    }
}

