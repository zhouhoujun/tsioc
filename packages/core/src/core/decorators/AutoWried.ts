import { IParamPropDecorator, createParamPropDecorator } from '../factories';
import { AutoWiredMetadata } from '../metadatas';
import { IContainer } from '../../IContainer';

/**
 * AutoWired decorator, for property or param. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @AutoWired
 */
export const AutoWired: IParamPropDecorator<AutoWiredMetadata> = createParamPropDecorator<AutoWiredMetadata>('AutoWired');

