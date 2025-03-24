import { createDecorator } from '@tsdi/ioc';
import { ParallelActivityOptions } from '../activities/Parallel';

export const Parallel = createDecorator<ParallelActivityOptions>('Parallel', {}); 