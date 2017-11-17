
import { Type } from '../Type';
import { PropertyMetadata, ParameterMetadata } from './Metadata';
import { createPropDecorator, IPropertyDecorator } from './PropertyDecoratorFactory';



/**
 * AutoWired metadata.
 *
 * @export
 * @interface AutoWiredMetadata
 * @extends {PropertyMetadata}
 */
export interface AutoWiredMetadata extends PropertyMetadata {
}
export const AutoWired: IPropertyDecorator<AutoWiredMetadata> = createPropDecorator<AutoWiredMetadata>('AutoWired');
