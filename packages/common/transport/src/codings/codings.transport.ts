import { Observable, Subject, finalize, from, fromEvent, map, mergeMap, share, takeUntil } from 'rxjs';
import { AbstractTransportSession, TransportOpts } from '../TransportSession';
import { Encoder } from './Encoder';
import { Decoder } from './Decoder';
import { CodingsContext } from './context';
import { IEventEmitter, IReadableStream, IWritableStream } from '../stream';
import { StreamAdapter, isBuffer } from '../StreamAdapter';
import { NotImplementedExecption } from '../execptions';
import { promisify } from '@tsdi/ioc';
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
        this.beforeEncode(ctx, data);
        return this.encodings.encode(data, ctx)
            .pipe(
                mergeMap(msg => {
                    this.afterEncode(ctx, data, msg);
                    return from(this.parseOutgoingMessage(data, msg, ctx))
                        .pipe(mergeMap(result => this.sendMessage(result, msg, data, ctx)))
                }),
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
                mergeMap(origin => {
                    const ctx = context ?? new CodingsContext(this);
                    this.beforeDecode(ctx, origin);
                    return from(this.parseIncomingMessage(origin, ctx))
                        .pipe(
                            mergeMap(msg => this.decodings.decode(msg, ctx)),
                            map(data => {
                                this.afterDecode(ctx, origin, data);
                                return data;
                            }),
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
    async destroy(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();
    }



    protected beforeEncode(ctx: CodingsContext, input: TInput) {
        if (this.options.beforeEncode) this.options.beforeEncode(ctx, input);
    }

    protected afterEncode(ctx: CodingsContext, data: TInput, msg: any) {
        if (this.options.beforeEncode) this.options.beforeEncode(ctx, data);
    }


    protected beforeDecode(ctx: CodingsContext, msg: TMsg) {
        if (this.options.beforeDecode) this.options.beforeDecode(ctx, msg);
    }

    protected afterDecode(ctx: CodingsContext, origin: TMsg, decoded: TOutput) {
        if (this.options.afterDecode) this.options.afterDecode(ctx, origin, decoded);
    }

    /**
     * send message.
     * @param originMsg 
     * @param encodedMsg 
     * @param context 
     * @returns 
     */
    protected async sendMessage(data: any, encodedMsg: Buffer | IReadableStream, originMsg: TInput, context: CodingsContext): Promise<any> {
        if (this.streamAdapter.isReadable(data)) {
            if (this.options.pipeTo) {
                await this.options.pipeTo(this.socket, data, originMsg, context)
            } else if (this.options.write) {
                await this.streamAdapter.write(data, this.streamAdapter.createWritable({
                    write: (chunk, encoding, callback) => {
                        this.options.write!(this.socket, chunk, originMsg, context, callback)
                    }
                }))
            } else if ((this.socket as IWritableStream).write) {
                await this.streamAdapter.write(data, this.socket as IWritableStream)
            } else {
                throw new NotImplementedExecption('Can not write message to socket!')
            }
        } else {
            if (this.options.write) {
                await promisify<any, any, any, CodingsContext, void>(this.options.write, this.options)(this.socket, data, originMsg, context)
            } else if ((this.socket as IWritableStream).write) {
                await promisify<any, void>((this.socket as IWritableStream).write, this.socket)(data)
            } else {
                throw new NotImplementedExecption('Can not write message to socket!')
            }
        }
        return data;

    }

    /**
     * handle message
     */
    protected handleMessage(context?: CodingsContext): Observable<TMsg> {
        if (this.options.handleMessage) return this.options.handleMessage(this.socket, context).pipe(takeUntil(this.destroy$));

        return fromEvent(this.socket as IEventEmitter, this.options.messageEvent ?? ev.DATA, this.options.messageEventHandle ? this.options.messageEventHandle : (chunk) => {
            if (isBuffer(chunk) || this.streamAdapter.isReadable(chunk)) return chunk as TMsg;
            return Buffer.from(chunk) as TMsg;
        }).pipe(takeUntil(this.destroy$));
    }




    protected async parseOutgoingMessage(originMsg: TInput, encodedMsg: Buffer | IReadableStream, context: CodingsContext): Promise<TMsg> {
        if (this.options.parseOutgoingMessage) {
            return await this.options.parseOutgoingMessage(originMsg, encodedMsg, context)
        }
        return encodedMsg as TMsg;
    }

    protected async parseIncomingMessage(incoming: TMsg, context: CodingsContext): Promise<Buffer | IReadableStream> {
        if (this.options.parseIncomingMessage) {
            return await this.options.parseIncomingMessage(incoming, context);
        }
        return incoming as Buffer | IReadableStream;
    }

}
