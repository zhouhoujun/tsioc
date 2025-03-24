import { createDecorator } from '@tsdi/ioc';
import { InvokeActivityOptions } from '../activities/Invoke';

export const Invoke = createDecorator<InvokeActivityOptions>('Invoke', {}); 