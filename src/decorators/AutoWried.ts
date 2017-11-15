import { createParamPropDecorator } from './factories';
import { Type } from '../Type';
import { PropertyMetadata } from './Metadata';


/**
 * AutoWired metadata.
 *
 * @export
 * @interface AutoWiredMetadata
 * @extends {PropertyMetadata}
 */
export interface AutoWiredMetadata extends PropertyMetadata {
}
export const AutoWired = createParamPropDecorator<AutoWiredMetadata>('AutoWired');
