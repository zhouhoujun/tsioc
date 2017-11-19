
import { Type } from '../Type';
import { IParamPropDecorator, createParamPropDecorator } from './ParamPropDecoratorFactory';
import { ParamPropMetadata } from '../metadatas';




/**
 * AutoWired metadata.
 *
 * @export
 * @interface AutoWiredMetadata
 * @extends {PropertyMetadata}
 */
export interface AutoWiredMetadata extends ParamPropMetadata {
}
export const AutoWired: IParamPropDecorator<AutoWiredMetadata> = createParamPropDecorator<AutoWiredMetadata>('AutoWired');
