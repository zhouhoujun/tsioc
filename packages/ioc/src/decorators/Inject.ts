import { IParamPropDecorator, createParamPropDecorator } from '../factories/DecoratorFactory';
import { InjectMetadata } from '../metadatas/InjectMetadata';

/**
 * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Inject
 */
export const Inject: IParamPropDecorator<InjectMetadata> = createParamPropDecorator<InjectMetadata>('Inject');
