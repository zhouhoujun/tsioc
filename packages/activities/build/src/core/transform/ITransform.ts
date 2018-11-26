import { ObjectMap } from '@ts-ioc/core';

/**
 * transform interface.
 *
 * @export
 * @interface ITransform
 * @extends {ObjectMap<any>}
 * @extends {NodeJS.ReadWriteStream}
 */
export interface ITransform extends ObjectMap<any>, NodeJS.ReadWriteStream {
    /**
     * set the stream source as origin.
     *
     * @type {boolean}
     * @memberof ITransform
     */
    changeAsOrigin?: boolean;
}
