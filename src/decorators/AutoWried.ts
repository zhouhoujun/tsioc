import { IParamPropDecorator, createParamPropDecorator } from './ParamPropDecoratorFactory';
import { AutoWiredMetadata } from '../metadatas';

export const AutoWired: IParamPropDecorator<AutoWiredMetadata> = createParamPropDecorator<AutoWiredMetadata>('AutoWired');
