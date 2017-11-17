
import { Type } from '../Type';
import { PropertyMetadata, ParameterMetadata } from './Metadata';
import { IParamPropDecorator, createParamPropDecorator, IParamPropMetadata } from './ParamPropDecoratorFactory';


/**
 * Inject metadata.
 *
 * @export
 * @interface InjectMetadata
 * @extends {PropertyMetadata}
 * @extends {ParameterMetadata}
 */
export interface InjectMetadata extends IParamPropMetadata {
}
export const Inject: IParamPropDecorator<InjectMetadata> = createParamPropDecorator<InjectMetadata>('Inject');
