import { EMPTY, Injectable, isString } from '@tsdi/ioc';
import { Observable, throwError } from 'rxjs';
import { stringify, TransportContext } from '../context';
import { Pattern, ReadPacket, WritePacket } from '../packet';
import { EventHandler, TransportHandler } from '../handler';
import { EventChain, NotFoundError, TransportHandlers } from '../handlers';
import { InterceptorHandler, TRANSPORT_INTERCEPTORS } from '../intercepting';

@Injectable()
export class TransportServerHandlers<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket>
    implements TransportHandlers<TRequest, TResponse> {

    protected readonly handlers = new Map<string, TransportHandler>();
    constructor() { }

    getHandlers(): Map<string, TransportHandler> {
        return this.handlers;
    }

    keys() {
        return Array.from(this.handlers.keys());
    }

    addHandler(pattern: string, handler: TransportHandler): void {
        const normalizedPattern = this.normalizePattern(pattern);
        if (this.handlers.has(normalizedPattern) && handler instanceof EventHandler) {
            let headRef = this.handlers.get(normalizedPattern)!;
            handler = new EventChain(headRef, handler);
            this.handlers.set(normalizedPattern, handler);
        } else {
            this.handlers.set(normalizedPattern, handler);
        }
    }

    getHandlerByPattern(pattern: Pattern): TransportHandler {
        const route = this.getRouteFromPattern(pattern);
        return this.handlers.get(route)!;
    }

    handle(ctx: TransportContext<TRequest, TResponse>): Observable<TResponse> {
        const route = this.getHandlerByPattern(ctx.arguments.pattern);
        if (!route) throwError(() => new NotFoundError());

        const interceptors = ctx.get(TRANSPORT_INTERCEPTORS) ?? EMPTY;
        let hanlder = (interceptors.length ? interceptors.reduceRight(
            (next, interceptor) => new InterceptorHandler(next, interceptor), route) : route) as TransportHandler<TRequest, TResponse>;

        return hanlder.handle(ctx);
    }

    protected normalizePattern(pattern: Pattern): string {
        return stringify(pattern);
    }

    protected getRouteFromPattern(pattern: Pattern): string {
        let validPattern: Pattern | undefined;
        if (isString(pattern)) {
            try {
                validPattern = JSON.parse(pattern);
            } catch (error) {
                // Uses a fundamental object (`pattern` variable without any conversion)
                validPattern = pattern;
            }
        }
        return this.normalizePattern(validPattern ?? pattern);
    }
}
