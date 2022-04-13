import { InjectableMetadata } from '@tsdi/ioc';


/**
 * activity metadata.
 *
 * @export
 * @interface ActivityMetadata
 * @extends {InjectableMetadata}
 */
 export interface ActivityMetadata extends InjectableMetadata {
    /**
     * activity decotactor selector.
     *
     * @type {string}
     * @memberof ActivityMetadata
     */
    selector?: string;
}
