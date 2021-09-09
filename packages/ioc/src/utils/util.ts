import { AnnotationType } from '../types';

/**
 * get class design annotation.
 *
 * @export
 * @param {ClassType} target
 * @returns
 */
export function getClassAnnotation(target: AnnotationType) {
    const annf = target.ρAnn || target.getClassAnnations;
    return typeof annf === 'function' ? annf.call(target) : null;
}

/**
 * target has class design annotation or not.
 *
 * @export
 * @param {ClassType} target
 * @returns {boolean}
 */
export function hasClassAnnotation(target: AnnotationType): boolean {
    return typeof (target.ρAnn || target.getClassAnnations) === 'function';
}
