import { ParameterMetadata } from '../metadatas/ParameterMetadata';
import { createParamDecorator, IParameterDecorator } from '../factories/DecoratorFactory';

/**
 * param decorator, define for parameter. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Param
 */
export const Param: IParameterDecorator<ParameterMetadata> = createParamDecorator<ParameterMetadata>('Param');
