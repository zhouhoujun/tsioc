import { createDecorator } from '@tsdi/ioc';
import { IntervalActivityOptions } from '../activities/Interval';

export const Interval = createDecorator<IntervalActivityOptions>('Interval', {}); 