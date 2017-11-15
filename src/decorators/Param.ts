import { createParamDecorator } from './factories';
import { Type } from '../Type';
import { ParameterMetadata } from './Metadata';

export const Param = createParamDecorator<ParameterMetadata>('Param');
