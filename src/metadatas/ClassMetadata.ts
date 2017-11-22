import { ProviderMetadata } from './ProviderMetadata';


/**
 * Singleton. default a
 *
 * @export
 * @interface SingletonMetadata
 */
export interface ClassMetadata extends ProviderMetadata {
    singleton?: boolean;
}

