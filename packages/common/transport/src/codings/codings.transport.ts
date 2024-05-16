import { promisify } from '@tsdi/ioc';
import { Observable, Subject, finalize, from, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
import { AbstractTransportSession, TransportOpts } from '../TransportSession';
import { Encoder } from './Encoder';
import { Decoder } from './Decoder';
import { CodingsContext } from './context';
import { IEventEmitter, IReadableStream, IWritableStream } from '../stream';
import { StreamAdapter, isBuffer } from '../StreamAdapter';
import { NotImplementedExecption } from '../execptions';
import { ev } from '../consts';


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
     * stream adapter.
     */
    abstract get streamAdapter(): StreamAdapter;

    protected destroy$ = new Subject<void>;

    /**
     * send.
     * @param data 
     */
    send(data: TInput, context?: CodingsContext): Observable<TMsg> {
        const ctx = context ?? new CodingsContext(this);
        !context && this.initContext(ctx);
        return this.encodings.encode(data, ctx)
            .pipe(
                mergeMap(msg => this.sendMessage(data, msg, ctx)),
                takeUntil(this.destroy$),
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
                            takeUntil(this.destroy$),
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
     * @param originMsg 
     * @param encodedMsg 
     * @param context 
     * @returns 
     */
    protected sendMessage(originMsg: TInput, encodedMsg: Buffer | IReadableStream, context: CodingsContext): Observable<any> {
        return from(this.parseMessage(originMsg, encodedMsg, context))
            .pipe(
                mergeMap(async data => {
                    if (this.streamAdapter.isReadable(data)) {
                        if (this.options.write) {
                            await this.streamAdapter.write(data, this.streamAdapter.createWritable({
                                write: (chunk, encoding, callback) => {
                                    this.options.write!(this.socket, chunk, encoding, callback)
                                }
                            }))
                        } else if ((this.socket as IWritableStream).write) {
                            await this.streamAdapter.write(data, this.socket as IWritableStream)
                        } else {
                            throw new NotImplementedExecption('Has not write method!')
                        }
                    } else {
                        if (this.options.write) {
                            await promisify<any, any, void>(this.options.write, this.options)(this.socket, data)
                        } else if ((this.socket as IWritableStream).write) {
                            await promisify<any, void>((this.socket as IWritableStream).write, this.socket)(data)
                        } else {
                            throw new NotImplementedExecption('Has not write method!')
                        }
                    }
                    return data;
                })
            );

    }

    protected async parseMessage(originMsg: TInput, encodedMsg: Buffer | IReadableStream, context: CodingsContext): Promise<TMsg> {
        if (this.options.parseMessage) {
            return await this.options.parseMessage(originMsg, encodedMsg, context)
        }
        return encodedMsg as TMsg;
    }

    /**
     * handle message
     */
    protected handleMessage(context?: CodingsContext): Observable<TMsg> {
        return (this.options.handleMessage ? this.options.handleMessage(this.socket, context) : fromEvent(this.socket as IEventEmitter, this.options.messageEvent ?? ev.DATA, (chunk) => {
            if (isBuffer(chunk) || this.streamAdapter.isReadable(chunk)) return chunk as TMsg;
            return Buffer.from(chunk) as TMsg;
        })).pipe(takeUntil(this.destroy$));
    }

}
