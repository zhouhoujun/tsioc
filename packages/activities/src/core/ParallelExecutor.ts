import { Abstract } from '@tsdi/ioc';

/**
 * parallel executor.
 *
 * @export
 * @abstract
 * @class ParallelExecutor
 */
@Abstract()
export abstract class ParallelExecutor {
    abstract run<T>(func: (item: T) => any, items: T[], ...args: any[]);
}
