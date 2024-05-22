import { promisify } from '@tsdi/ioc';
import { Encoder, Decoder } from '@tsdi/common/codings';
import { Observable, Subject, finalize, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
import { AbstractTransportSession, TransportOpts } from './TransportSession';
import { IEventEmitter, IReadableStream, IWritableStream } from './stream';
import { StreamAdapter, isBuffer } from './StreamAdapter';
import { NotImplementedExecption } from './execptions';
import { ev } from './consts';
import { TransportContext } from './context';


/**
 * base codings transport session.
 */
export abstract class BaseTransportSession<TSocket = any, TInput = any, TOutput = any, TMsg = any> extends AbstractTransportSession<TSocket, TInput, TOutput, TMsg, TransportContext> {
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
    send(data: TInput, context?: TransportContext): Observable<TMsg> {
        const ctx = context ?? new TransportContext(this);
        ctx.outgoing = data;
        return this.encodings.encode(data, ctx)
            .pipe(
                mergeMap(encoded => this.sendMessage(encoded, data, ctx)),
                takeUntil(this.destroy$),
                finalize(() => !context && ctx.onDestroy()),
                share()
            )
    }

    /**
     * receive
     * @param req the message response for.
     */
    receive(context?: TransportContext): Observable<TOutput> {
        return this.handleMessage(context)
            .pipe(
                mergeMap(origin => {
                    const ctx = context ?? new TransportContext(this);
                    ctx.incoming = origin;
                    return this.decodings.decode(origin, ctx)
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
    async destroy(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * send message.
     * @param originMsg 
     * @param encodedMsg 
     * @param context 
     * @returns 
     */
    protected sendMessage(data: any, originMsg: TInput, context: TransportContext): Promise<any> | Observable<any> {
        if (this.streamAdapter.isReadable(data)) {
            return this.pipeTo(this.socket, data, originMsg, context)
        } else {
            return this.write(this.socket, data, originMsg, context);
        }
    }

    /**
     * pipe endcoed data to socket
     * @param socket 
     * @param data 
     * @param originData 
     * @param ctx 
     */
    protected async pipeTo(socket: any, data: IReadableStream, originData: any, context: TransportContext): Promise<any> {
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
        return data;
    }


    /**
     * write endcoed data to socket.
     * @param socket 
     * @param data 
     * @param originData 
     * @param ctx 
     * @param cb 
     */
    protected async write(socket: any, data: any, originData: any, context: TransportContext): Promise<any> {
        if (this.options.write) {
            await promisify<any, any, any, TransportContext, void>(this.options.write, this.options)(socket, data, originData, context)
        } else if ((socket as IWritableStream).write) {
            await promisify<any, void>((socket as IWritableStream).write, socket)(data)
        } else {
            throw new NotImplementedExecption('Can not write message to socket!')
        }
        return data
    }

    /**
     * handle message
     */
    protected handleMessage(context?: TransportContext): Observable<TMsg> {
        if (this.options.handleMessage) return this.options.handleMessage(this.socket, context).pipe(takeUntil(this.destroy$));

        return fromEvent(this.socket as IEventEmitter, this.options.messageEvent ?? ev.DATA, this.options.messageEventHandle ? this.options.messageEventHandle : (chunk) => {
            if (isBuffer(chunk) || this.streamAdapter.isReadable(chunk)) return chunk as TMsg;
            return Buffer.from(chunk) as TMsg;
        }).pipe(takeUntil(this.destroy$));
    }

}
