import { IocCoreService, Type, PromiseUtil } from '@ts-ioc/ioc';
import { BootContext } from '../BootContext';

/**
 *  next
 */
export type Next = () => Promise<void>;

export abstract class Middleware<T extends BootContext> extends IocCoreService {
    constructor() {
        super();
    }

    abstract execute(ctx: T, next: Next): Promise<void>;
}

/**
 *  middleware type.
 */
export type MiddlewareType<T extends BootContext> = Type<Middleware<T>> | Middleware<T> | PromiseUtil.ActionHandle<T>;
