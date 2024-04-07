import { Observable, finalize, mergeMap, share } from 'rxjs';
import { AbstractTransportSession, TransportOpts } from '../TransportSession';
import { CodingsContext, Decoder, Encoder } from './codings';

/**
 * base codings transport session.
 */
export abstract class BaseTransportSession<TSocket = any, TInput = any, TOutput = any, TMsg = any> extends AbstractTransportSession<TSocket, TInput, TOutput, TMsg, CodingsContext> {
    /**
     * socket.
     */
    abstract get socket(): TSocket;
    /**
     * transport options.
     */
    abstract get options(): TransportOpts;

    /**
     * encodings
     */
    abstract get encodings(): Encoder;
    /**
     * decodings
     */
    abstract get decodings(): Decoder;

    /**
     * send.
     * @param data 
     */
    send(data: TInput, context?: CodingsContext): Observable<TMsg> {
        const ctx = context ?? new CodingsContext(this);
        return this.encodings.encode(data, ctx)
            .pipe(
                mergeMap(msg => this.sendMessage(data, msg as TMsg)),
                finalize(() => !context && ctx.onDestroy()),
                share()
            )
    }

    abstract sendMessage(data: TInput, msg: TMsg): Observable<TMsg>;

    /**
     * receive
     * @param req the message response for.
     */
    receive(context?: CodingsContext): Observable<TOutput> {
        return this.handleMessage()
            .pipe(
                mergeMap(msg => {
                    const ctx = context ?? new CodingsContext(this);
                    return this.decodings.decode(msg, ctx)
                        .pipe(
                            finalize(() => !context && ctx.onDestroy())
                        )
                }),
                share()
            )
    }

    /**
     * handle message
     */
    abstract handleMessage(): Observable<TMsg>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}
