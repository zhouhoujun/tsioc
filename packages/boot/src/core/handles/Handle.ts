import { IocCoreService, Type, PromiseUtil } from '@ts-ioc/ioc';
import { HandleContext } from './HandleContext';

/**
 *  next
 */
export type Next = () => Promise<void>;

/**
 * middleware
 *
 * @export
 * @abstract
 * @class Middleware
 * @extends {IocCoreService}
 * @template T
 */
export abstract class Handle<T extends HandleContext> extends IocCoreService {
    constructor() {
        super();
    }

    abstract execute(ctx: T, next: Next): Promise<void>;
}

/**
 *  middleware type.
 */
export type HandleType<T extends HandleContext> = Type<Handle<T>> | Handle<T> | PromiseUtil.ActionHandle<T>;
