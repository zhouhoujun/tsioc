import { ParameterMetadata } from '../metadatas';
import { createParamDecorator, IParameterDecorator } from '../factories';

export const Param: IParameterDecorator<ParameterMetadata> = createParamDecorator<ParameterMetadata>('Param');
