import { IService } from './Service';
import { IRunner } from './Runner';

/**
 * runn able.
 */
export type Runnable<T> = T | IService<T> | IRunner<T>;
