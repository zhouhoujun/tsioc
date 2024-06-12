import { promisify } from '@tsdi/ioc';
import { Message } from '@tsdi/common';
import { Encoder, Decoder, CodingType } from '@tsdi/common/codings';
import { Observable, Subject, finalize, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
import { AbstractTransportSession } from './TransportSession';
import { IEventEmitter, IWritableStream } from './stream';
import { StreamAdapter, isBuffer } from './StreamAdapter';
import { NotImplementedExecption } from './execptions';
import { ev } from './consts';
import { TransportContext } from './context';
import { StatusAdapter } from './StatusAdapter';


/**
 * base transport session via codings.
 */
export abstract class BaseTransportSession<TSocket = any, TInput = any, TOutput = any, TMsg extends Message = Message> extends AbstractTransportSession<TSocket, TInput, TOutput> {

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
    /**
     * status adapter.
     */
    abstract get statusAdapter(): StatusAdapter | null;


    protected destroy$ = new Subject<void>;

    /**
     * send.
     * @param data 
     */
    send(data: TInput, context?: TransportContext): Observable<TMsg> {
        const ctx = context ?? new TransportContext(this);
        // ctx.outgoing = data;
        return this.encodings.encode(data, ctx.next(data, CodingType.Encode))
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
                    // ctx.incoming = origin;
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
     * @param msg 
     * @param input 
     * @param context 
     * @returns 
     */
    protected sendMessage(msg: TMsg, input: TInput, context: TransportContext): Promise<TMsg> | Observable<TMsg> {
        if (this.streamAdapter.isReadable(msg.data)) {
            return this.pipeTo(this.socket, msg, input, context)
        } else {
            return this.write(this.socket, msg, input, context);
        }
    }

    /**
     * pipe endcoed data to socket
     * @param socket 
     * @param msg 
     * @param input 
     * @param ctx 
     */
    protected async pipeTo(socket: any, msg: Message, input: TInput, context: TransportContext): Promise<TMsg> {
        if (this.options.pipeTo) {
            await this.options.pipeTo(socket, msg, input, context)
        } else if (msg.data && this.options.write) {
            await this.streamAdapter.write(msg.data, this.streamAdapter.createWritable({
                write: (chunk, encoding, callback) => {
                    this.options.write!(socket, chunk, input, context, callback)
                }
            }))
        } else if (msg.data && (socket as IWritableStream).write) {
            await this.streamAdapter.write(msg.data, socket as IWritableStream)
        } else {
            throw new NotImplementedExecption('Can not write message to socket!')
        }
        return msg as TMsg;
    }


    /**
     * write endcoed data to socket.
     * @param socket 
     * @param msg 
     * @param input 
     * @param ctx 
     * @param cb 
     */
    protected async write(socket: any, msg: Message, input: TInput, context: TransportContext): Promise<TMsg> {
        if (this.options.write) {
            await promisify<any, any, any, TransportContext, void>(this.options.write, this.options)(socket, msg, input, context)
        } else if (msg.data && (socket as IWritableStream).write) {
            await promisify<any, void>((socket as IWritableStream).write, socket)(msg.data)
        } else {
            throw new NotImplementedExecption('Can not write message to socket!')
        }
        return msg as TMsg
    }

    /**
     * handle message
     */
    protected handleMessage(context?: TransportContext): Observable<TMsg> {
        if (this.options.handleMessage) return this.options.handleMessage(this.socket, this.messageFactory, context).pipe(takeUntil(this.destroy$));

        return fromEvent(this.socket as IEventEmitter, this.options.messageEvent ?? ev.DATA, this.options.messageEventHandle ? this.options.messageEventHandle : (chunk) => {
            if (!isBuffer(chunk) && !this.streamAdapter.isReadable(chunk)) {
                chunk = Buffer.from(chunk);
            }
            return this.messageFactory.create({data: chunk});
        }).pipe(takeUntil(this.destroy$));
    }

}
