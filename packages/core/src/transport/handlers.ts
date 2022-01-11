import { Abstract, EMPTY, Injectable, InvocationContext, isString } from '@tsdi/ioc';
import { mergeMap, Observable, throwError } from 'rxjs';
import { EventHandler, TransportError, TransportHandler } from './handler';
import { InterceptorHandler, TRANSPORT_INTERCEPTORS } from './intercepting';
import { TransportRequest, TransportResponse } from './packet';
import { Pattern, stringify } from './pattern';



@Abstract()
export abstract class TransportHandlers<TInput = any, TOutput = any> extends TransportHandler<TInput, TOutput> {
    abstract keys(): string[];
    abstract getHandlers(): Map<string, TransportHandler>;
    abstract addHandler(pattern: Pattern, handler: TransportHandler): void;
    abstract getHandlerByPattern(pattern: Pattern): TransportHandler | undefined;
}


export class EventChain<TInput = any, TOutput = any> extends EventHandler<TInput, TOutput> {
    constructor(private handler: TransportHandler, private next: TransportHandler) {
        super()
    }
    handle(ctx: InvocationContext<TInput>): Observable<TOutput> {
        return this.handler.handle(ctx).pipe(mergeMap(v => this.next.handle(v)));
    }
}


@Injectable()
export class ServerHandler implements TransportHandlers {

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

    handle(ctx: InvocationContext<TransportRequest>): Observable<TransportResponse> {
        const route = this.getHandlerByPattern(ctx.arguments.pattern);
        if (!route) throwError(()=> new NotFoundError());

        const interceptors = ctx.get(TRANSPORT_INTERCEPTORS) ?? EMPTY;
        let hanlder = interceptors.length ? interceptors.reduceRight(
            (next, interceptor) => new InterceptorHandler(next, interceptor), route) : route;

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


export class NotFoundError extends TransportError {
    constructor(message = 'Not Found') {
        super(404, message);
    }
}