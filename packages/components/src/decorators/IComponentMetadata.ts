import { InjectableMetadata } from '@tsdi/ioc';

/**
 * component metadata.
 *
 * @export
 * @interface IComponentMetadata
 * @extends {InjectableMetadata}
 */
export interface IComponentMetadata extends InjectableMetadata {
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
