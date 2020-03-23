import { InjectableMetadata } from '@tsdi/ioc';

/**
 * component metadata.
 *
 * @export
 * @interface IComponentMetadata
 * @extends {InjectableMetadata}
 */
export interface IDirectiveMetadata extends InjectableMetadata {
    /**
     * decotactor selector.
     *
     * @type {string}
     * @memberof IComponentMetadata
     */
    selector?: string;
}


/**
 * component metadata.
 *
 * @export
 * @interface IComponentMetadata
 * @extends {IDirectiveMetadata}
 */
export interface IComponentMetadata extends IDirectiveMetadata {
    /**
     * component selector.
     *
     * @type {string}
     * @memberof IComponentMetadata
     */
    selector?: string;
    /**
     * template for component.
     *
     * @type {*}
     * @memberof IComponentMetadata
     */
    template?: any;
}
