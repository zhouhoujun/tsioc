import { AnnotationType, typeAnn } from '../types';


/**
 * get class design annotation.
 *
 * @export
 * @param {ClassType} target
 * @returns
 */
export function getClassAnnotation<T>(target: AnnotationType<T>) {
    const annf = target[typeAnn];
    return typeof annf === 'function' ? (annf as Function).call(target) : null
}

/**
 * target has class design annotation or not.
 *
 * @export
 * @param {ClassType} target
 * @returns {boolean}
 */
export function hasClassAnnotation<T>(target: AnnotationType<T>): boolean {
    return typeof target[typeAnn] === 'function'
}
