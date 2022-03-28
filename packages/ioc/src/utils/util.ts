import { AnnotationType } from '../types';


const type_func = 'function';
/**
 * get class design annotation.
 *
 * @export
 * @param {ClassType} target
 * @returns
 */
export function getClassAnnotation(target: AnnotationType) {
    const annf = target.ρAnn || target.getClassAnnations;
    return typeof annf === type_func ? (annf as Function).call(target) : null;
}

/**
 * target has class design annotation or not.
 *
 * @export
 * @param {ClassType} target
 * @returns {boolean}
 */
export function hasClassAnnotation(target: AnnotationType): boolean {
    return typeof (target.ρAnn || target.getClassAnnations) === type_func;
}
