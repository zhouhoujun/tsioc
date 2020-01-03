import { TypeMetadata } from './TypeMetadata';
import { RegInMetadata } from './InjectableMetadata';

/**
 * AutoWired metadata.
 *
 * @export
 * @interface AutorunMetadata
 * @extends {TypeMetadata}
 */
export interface AutorunMetadata extends TypeMetadata, RegInMetadata {
    autorun?: string;
    singleton?: boolean;
    order?: number;
}
