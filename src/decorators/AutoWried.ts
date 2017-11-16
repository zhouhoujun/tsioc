
import { Type } from '../Type';
import { PropertyMetadata, ParameterMetadata } from './Metadata';
// import { IParamPropDecorator, createParamPropDecorator } from './ParamPropDecoratorFactory';
import { createPropDecorator, IPropertyDecorator } from './PropertyDecoratorFactory';



/**
 * AutoWired metadata.
 *
 * @export
 * @interface AutoWiredMetadata
 * @extends {PropertyMetadata, ParameterMetadata}
 */
export interface AutoWiredMetadata extends PropertyMetadata {
}
export const AutoWired: IPropertyDecorator = createPropDecorator<AutoWiredMetadata>('AutoWired');
