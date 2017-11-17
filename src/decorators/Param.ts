
import { Type } from '../Type';
import { ParameterMetadata } from './Metadata';
import { createParamDecorator, IParameterDecorator } from './ParamDecoratorFactory';

export const Param: IParameterDecorator<ParameterMetadata> = createParamDecorator<ParameterMetadata>('Param');
