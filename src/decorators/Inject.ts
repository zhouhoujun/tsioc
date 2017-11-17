
import { Type } from '../Type';
import { IParamPropDecorator, createParamPropDecorator, IParamPropMetadata } from './ParamPropDecoratorFactory';


/**
 * Inject metadata.
 *
 * @export
 * @interface InjectMetadata
 * @extends {IParamPropMetadata}
 */
export interface InjectMetadata extends IParamPropMetadata {
}
export const Inject: IParamPropDecorator<InjectMetadata> = createParamPropDecorator<InjectMetadata>('Inject');
