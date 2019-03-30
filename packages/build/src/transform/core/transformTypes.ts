import { CtxType, Expression, ExpressionType } from '@tsdi/activities';
import { ITransform } from './ITransform';
import { ObjectMap, isObservable, isObject, isFunction } from '@tsdi/ioc';
import { Stream } from 'stream';
import { AssetConfigure } from '../../core';



/**
 * transform type.
 */
export type TransformType = Expression<ITransform>;

/**
 * transform config type.
 */
export type TransformConfig = ExpressionType<ITransform> | AssetConfigure;

/**
 * task transform express.
 */
export type TransformExpress = CtxType<TransformConfig[]>;

/**
 * transform dest express
 */
export type DestExpress = ObjectMap<TransformExpress> | TransformExpress;


/**
 *check target is transform or not.
 *
 * @export
 * @param {*} target
 * @returns {boolean}
 */
export function isTransform(target: any): boolean {
    return (isObject(target) === true) && (target instanceof Stream || (isFunction(target.pipe) && !isObservable(target)));
}
