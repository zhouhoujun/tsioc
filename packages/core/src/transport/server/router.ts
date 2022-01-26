import { EMPTY, Injectable, isString } from '@tsdi/ioc';
import { mergeMap, Observable, throwError } from 'rxjs';
import { stringify, TransportContext } from '../context';
import { Pattern, ReadPacket, WritePacket } from '../packet';
import { EventHandler, TransportHandler } from '../handler';

@Injectable()
export class TransportRouter<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket>
    implements TransportHandler<TRequest, TResponse> {

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
        const route = this.getHandlerByPattern(ctx.arguments.pattern) as TransportHandler<TRequest, TResponse>;
        if (!route) throwError(() => ctx.throwError('Not Found'));
        return route.handle(ctx);
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


/**
 * event chain.
 */
 export class EventChain extends EventHandler {
    constructor(private handler: TransportHandler, private next: TransportHandler) {
        super()
    }
    handle(ctx: TransportContext): Observable<WritePacket> {
        return this.handler.handle(ctx).pipe(mergeMap(v => this.next.handle(ctx)));
    }
}

