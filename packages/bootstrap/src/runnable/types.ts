import { IService } from './Service';
import { IRunner } from './Runner';

/**
 * runn able.
 */
export type Runnable<T> = IService<T> | IRunner<T>;
