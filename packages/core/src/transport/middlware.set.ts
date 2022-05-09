import { Abstract, EMPTY, isNumber } from '@tsdi/ioc';
import { TransportContext } from './context';
import { MiddlewareInst } from './endpoint';

/**
 * middleware set.
 */
@Abstract()
export abstract class MiddlewareSet<T extends TransportContext = TransportContext> {
    /**
     * middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    abstract use(middleware: MiddlewareInst<T>, order?: number): void;
    /**
     * get all middlewares.
     */
    abstract getAll(): MiddlewareInst<T>[];
}

/**
 * basic middleware.
 */
export class BasicMiddlewareSet<T extends TransportContext> implements MiddlewareSet<T> {
    protected middlewares: MiddlewareInst<T>[];
    constructor(middlewares?: MiddlewareInst<T>[]) {
        this.middlewares = [...middlewares ?? EMPTY];
    }

    use(middleware: MiddlewareInst<T>, order?: number): void {
        if (isNumber(order)) {
            this.middlewares.splice(order, 0, middleware);
        } else {
            this.middlewares.push(middleware);
        }
    }

    getAll(): MiddlewareInst<T>[] {
        return this.middlewares;
    }
}
