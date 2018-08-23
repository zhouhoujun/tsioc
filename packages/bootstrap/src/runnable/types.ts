import { IService } from './Service';
import { IRunner } from './IRunner';

/**
 * runn able.
 */
export type Runnable<T> = T | IService<T> | IRunner<T>;
