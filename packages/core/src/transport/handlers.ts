import { Abstract } from '@tsdi/ioc';
import { mergeMap, Observable } from 'rxjs';
import { Pattern } from './pattern';
import { TransportContext } from './context';
import { EventHandler, TransportError, TransportHandler } from './handler';
import { ReadPacket, WritePacket } from './packet';


/**
 * transport handlers.
 */
@Abstract()
export abstract class TransportHandlers<TRequest extends ReadPacket = ReadPacket, TRepsonse extends WritePacket = WritePacket> extends TransportHandler<TRequest, TRepsonse> {
    abstract keys(): string[];
    abstract getHandlers(): Map<string, TransportHandler>;
    abstract addHandler(pattern: Pattern, handler: TransportHandler): void;
    abstract getHandlerByPattern(pattern: Pattern): TransportHandler | undefined;
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


export class NotFoundError extends TransportError {
    constructor(message = 'Not Found') {
        super(404, message);
    }
}