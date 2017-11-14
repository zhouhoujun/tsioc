import { createPropDecorator, PropertyMetadata } from './factories';
import { Type } from '../Type';


/**
 * AutoWired metadata.
 *
 * @export
 * @interface AutoWiredMetadata
 * @extends {PropertyMetadata}
 */
export interface AutoWiredMetadata extends PropertyMetadata {
}
export const AutoWired = createPropDecorator<AutoWiredMetadata>('AutoWired');
