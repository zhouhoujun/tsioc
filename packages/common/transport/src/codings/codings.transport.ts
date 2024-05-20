import { promisify } from '@tsdi/ioc';
import { Observable, Subject, finalize, from, fromEvent, map, mergeMap, share, takeUntil } from 'rxjs';
import { AbstractTransportSession, TransportOpts } from '../TransportSession';
import { IEventEmitter, IReadableStream, IWritableStream } from '../stream';
import { StreamAdapter, isBuffer } from '../StreamAdapter';
import { NotImplementedExecption } from '../execptions';
import { ev } from '../consts';
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
        return from(this.beforeEncode(ctx, data))
            .pipe(
                mergeMap(data => this.encodings.encode(data, ctx)),
                mergeMap(msg => {
                    return from(this.afterEncode(ctx, data, msg))
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
                    return from(this.beforeDecode(ctx, origin))
                        .pipe(
                            mergeMap(msg => this.decodings.decode(msg, ctx)),
                            mergeMap(data => this.afterDecode(ctx, origin, data)),
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



    protected async beforeEncode(ctx: CodingsContext, input: TInput): Promise<any> {
        if (this.options.beforeEncode) return await this.options.beforeEncode(ctx, input);
        return input;
    }

    protected async afterEncode(ctx: CodingsContext, data: TInput, msg: any): Promise<any> {
        if (this.options.afterEncode) return await this.options.afterEncode(ctx, data, msg);
        return msg;
    }


    protected async beforeDecode(ctx: CodingsContext, msg: TMsg) {
        if (this.options.beforeDecode) return await this.options.beforeDecode(ctx, msg);
        return msg;
    }

    protected async afterDecode(ctx: CodingsContext, origin: TMsg, decoded: TOutput): Promise<TOutput> {
        if (this.options.afterDecode) return await this.options.afterDecode(ctx, origin, decoded) as TOutput;
        return decoded as TOutput;
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
            await this.pipeTo(this.socket, data, originMsg, context)
        } else {
            await this.write(this.socket, data, originMsg, context);
        }
        return data;
    }

    /**
     * pipe endcoed data to socket
     * @param socket 
     * @param data 
     * @param originData 
     * @param ctx 
     */
    protected async pipeTo(socket: any, data: IReadableStream, originData: any, context: CodingsContext): Promise<void> {
        if (this.options.pipeTo) {
            await this.options.pipeTo(socket, data, originData, context)
        } else if (this.options.write) {
            await this.streamAdapter.write(data, this.streamAdapter.createWritable({
                write: (chunk, encoding, callback) => {
                    this.options.write!(socket, chunk, originData, context, callback)
                }
            }))
        } else if ((socket as IWritableStream).write) {
            await this.streamAdapter.write(data, socket as IWritableStream)
        } else {
            throw new NotImplementedExecption('Can not write message to socket!')
        }
    }


    /**
     * write endcoed data to socket.
     * @param socket 
     * @param data 
     * @param originData 
     * @param ctx 
     * @param cb 
     */
    protected async write(socket: any, data: any, originData: any, context: CodingsContext): Promise<void> {
        if (this.options.write) {
            await promisify<any, any, any, CodingsContext, void>(this.options.write, this.options)(socket, data, originData, context)
        } else if ((socket as IWritableStream).write) {
            await promisify<any, void>((socket as IWritableStream).write, socket)(data)
        } else {
            throw new NotImplementedExecption('Can not write message to socket!')
        }
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

}
