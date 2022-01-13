import { Abstract } from '@tsdi/ioc';
import { mergeMap, Observable } from 'rxjs';
import { EventHandler, TransportContext, TransportError, TransportHandler } from './handler';
import { Pattern } from './pattern';


/**
 * transport handlers.
 */
@Abstract()
export abstract class TransportHandlers<TInput = any, TOutput = any> extends TransportHandler<TInput, TOutput> {
    abstract keys(): string[];
    abstract getHandlers(): Map<string, TransportHandler>;
    abstract addHandler(pattern: Pattern, handler: TransportHandler): void;
    abstract getHandlerByPattern(pattern: Pattern): TransportHandler | undefined;
}

/**
 * event chain.
 */
export class EventChain<TInput = any, TOutput = any> extends EventHandler<TInput, TOutput> {
    constructor(private handler: TransportHandler, private next: TransportHandler) {
        super()
    }
    handle(ctx: TransportContext<TInput>): Observable<TOutput> {
        return this.handler.handle(ctx).pipe(mergeMap(v => this.next.handle(v)));
    }
}


export class NotFoundError extends TransportError {
    constructor(message = 'Not Found') {
        super(404, message);
    }
}