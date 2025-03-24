import { createDecorator } from '@tsdi/ioc';
import { TimerActivityOptions } from '../activities/TimerActivity';

export const Timer = createDecorator<TimerActivityOptions>('Timer', {}); 