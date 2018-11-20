import { ProviderTypes } from '../../types';
import { TypeMetadata } from './TypeMetadata';

/**
 * add reference metadata. add ref service to the class.
 *
 * @export
 * @interface AddRefMetadata
 * @extends {TypeMetadata}
 */
export interface ProvidersMetadata  extends TypeMetadata {

    /**
     * add ref service to the class.
     *
     * @type {KeyValue<Token<any>, Token<any>>}
     * @memberof AddRefMetadata
     */
    providers?: ProviderTypes[];
}
