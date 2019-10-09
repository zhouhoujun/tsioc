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
    /**
     * run parallel.
     *
     * @abstract
     * @template T
     * @param {(item: T) => any} func
     * @param {T[]} items
     * @param {...any[]} args
     * @memberof ParallelExecutor
     */
    abstract run<T>(func: (item: T) => any, items: T[], ...args: any[]);
}
