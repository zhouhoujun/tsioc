import { createDecorator } from '@tsdi/ioc';
import { ThrowActivityOptions } from '../activities/Throw';

export const Throw = createDecorator<ThrowActivityOptions>('Throw', {}); 