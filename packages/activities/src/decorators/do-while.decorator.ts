import { createDecorator } from '@tsdi/ioc';
import { DoWhileActivityOptions } from '../activities/DoWhile';

export const DoWhile = createDecorator<DoWhileActivityOptions>('DoWhile', {}); 