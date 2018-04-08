import { ParameterMetadata } from '../metadatas/index';
import { createParamDecorator, IParameterDecorator } from '../factories/index';

export const Param: IParameterDecorator<ParameterMetadata> = createParamDecorator<ParameterMetadata>('Param');
