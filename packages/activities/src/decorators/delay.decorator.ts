import { createDecorator } from '@tsdi/ioc';
import { DelayActivityOptions } from '../activities/Delay';

export const Delay = createDecorator<DelayActivityOptions>('Delay', {}); 