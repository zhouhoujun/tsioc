import { InjectTypes } from '../providers/types';
import { TypeMetadata } from './TypeMetadata';

/**
 * add reference metadata. add ref service to the class.
 *
 * @export
 * @interface ProvidersMetadata
 * @extends {TypeMetadata}
 */
export interface ProvidersMetadata  extends TypeMetadata {
    /**
     * add ref service to the class.
     *
     * @type {KeyValue<Token, Token>}
     * @memberof ProvidersMetadata
     */
    providers?: InjectTypes[];
}
