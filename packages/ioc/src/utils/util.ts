import { AnnotationType } from '../types';

/**
 * get class design annotation.
 *
 * @export
 * @param {ClassType} target
 * @returns
 */
export function getClassAnnotation(target: AnnotationType) {
    let annf: Function = target.ρAnn || target.d0Ann || target.getClassAnnations;
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
    return typeof (target.ρAnn || target.d0Ann || target.getClassAnnations) === 'function';
}
