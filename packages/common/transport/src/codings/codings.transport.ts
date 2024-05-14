import { Observable, finalize, mergeMap, share } from 'rxjs';
import { AbstractTransportSession, TransportOpts } from '../TransportSession';
import { Encoder } from './Encoder';
import { Decoder } from './Decoder';
import { CodingsContext } from './context';


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
        !context && this.initContext(ctx);
        return this.encodings.encode(data, ctx)
            .pipe(
                mergeMap(msg => this.sendMessage(data, msg as TMsg)),
                finalize(() => !context && ctx.onDestroy()),
                share()
            )
    }

    /**
     * receive
     * @param req the message response for.
     */
    receive(context?: CodingsContext): Observable<TOutput> {
        return this.handleMessage(context)
            .pipe(
                mergeMap(msg => {
                    const ctx = context ?? new CodingsContext(this);
                    !context && this.initContext(ctx, msg);
                    return this.decodings.decode(msg, ctx)
                        .pipe(
                            finalize(() => !context && ctx.onDestroy())
                        )
                }),
                share()
            )
    }

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;


    /**
     * init condings context
     * @param ctx 
     * @param msg 
     */
    protected initContext(ctx: CodingsContext, msg?: TMsg) { }

    /**
     * send message.
     * @param data 
     * @param msg 
     */
    protected abstract sendMessage(data: TInput, msg: TMsg): Observable<TMsg>;

    /**
     * handle message
     */
    protected abstract handleMessage(context?: CodingsContext): Observable<TMsg>;

}
