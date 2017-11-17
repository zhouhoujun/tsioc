
import { Type } from '../Type';
import { IParamPropDecorator, createParamPropDecorator, IParamPropMetadata } from './ParamPropDecoratorFactory';




/**
 * AutoWired metadata.
 *
 * @export
 * @interface AutoWiredMetadata
 * @extends {PropertyMetadata}
 */
export interface AutoWiredMetadata extends IParamPropMetadata {
}
export const AutoWired: IParamPropDecorator<AutoWiredMetadata> = createParamPropDecorator<AutoWiredMetadata>('AutoWired');
