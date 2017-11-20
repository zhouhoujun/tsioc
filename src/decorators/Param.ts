import { ParameterMetadata } from '../metadatas';
import { createParamDecorator, IParameterDecorator } from './ParamDecoratorFactory';

export const Param: IParameterDecorator<ParameterMetadata> = createParamDecorator<ParameterMetadata>('Param');
