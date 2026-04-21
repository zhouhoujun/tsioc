import { Type } from '../types';
/**
 * this fn can use new or not.
 * @param fn
 * @returns
 */
export declare function isNewable(fn: Function): boolean;
/**
 * is type or not.
 * @param t
 * @returns
 */
export declare function isType(t: any): t is Type<any>;
/**
 * check target is primitive type or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export declare function isPrimitiveType(target: any): boolean;
export declare function isIterableType(target: Function): boolean;
export declare function isPrimitive(target: Function): boolean;
/**
 * is target basic type, value or not.
 * @param target
 * @returns
 */
export declare function isBasic(target: any): boolean;
export declare function isBasicType(target: Function): boolean;
/**
 * get type of object.
 *
 * @export
 * @param {*} target
 * @returns {Type}
 */
export declare function getType(target: any): Type;
/**
 * get type name.
 *
 * @export
 * @param {} target
 * @returns {string}
 */
export declare function getTypeName(target: any): string;
