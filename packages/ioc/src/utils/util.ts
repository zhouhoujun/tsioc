import { AnnotationType, typeAnn } from '../types';


/**
 * get class design annotation.
 *
 * @export
 * @param {ClassType} target
 * @returns
 */
export function getClassAnnotation(target: AnnotationType) {
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
export function hasClassAnnotation(target: AnnotationType): boolean {
    return typeof target[typeAnn] === 'function'
}
