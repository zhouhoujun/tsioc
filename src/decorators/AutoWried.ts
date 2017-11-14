import { createPropDecorator, PropertyMetadata } from './factories';
import { Type } from '../Type';



export interface AutoWiredMetadata extends PropertyMetadata {
}
export const AutoWired = createPropDecorator<AutoWiredMetadata>('AutoWired');
