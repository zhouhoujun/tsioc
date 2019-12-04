import { IMethodPropParamDecorator, createMethodPropParamDecorator } from '../factories/MethodPropParamDecoratorFactory';
import { AutoWiredMetadata } from '../metadatas/AutoWiredMetadata';

/**
 * AutoWired decorator, for property or param. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @AutoWired
 */
export const AutoWired: IMethodPropParamDecorator<AutoWiredMetadata> = createMethodPropParamDecorator<AutoWiredMetadata>('AutoWired');

