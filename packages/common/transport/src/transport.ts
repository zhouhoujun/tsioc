import { promisify } from '@tsdi/ioc';
import { Message } from '@tsdi/common';
import { Encoder, Decoder } from '@tsdi/common/codings';
import { Observable, Subject, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
import { AbstractTransportSession } from './TransportSession';
import { IEventEmitter, IWritableStream } from './stream';
import { isBuffer } from './StreamAdapter';
import { NotImplementedExecption } from './execptions';
import { ev } from './consts';


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


    protected destroy$ = new Subject<void>;

    /**
     * send.
     * @param data 
     */
    send(data: TInput): Observable<TMsg> {
        return this.encodings.encode(data)
            .pipe(
                mergeMap(encoded => this.sendMessage(encoded, data)),
                takeUntil(this.destroy$),
                share()
            )
    }

    /**
     * receive
     * @param req the message response for.
     */
    receive(req?: any): Observable<TOutput> {
        return this.handleMessage()
            .pipe(
                mergeMap(origin => {
                    return this.decodings.decode(origin, req)
                        .pipe(
                            takeUntil(this.destroy$)
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
    protected sendMessage(msg: TMsg, input: TInput): Promise<TMsg> | Observable<TMsg> {
        if (this.streamAdapter.isReadable(msg.data)) {
            return this.pipeTo(this.socket, msg, input)
        } else {
            return this.write(this.socket, msg, input);
        }
    }

    /**
     * pipe endcoed data to socket
     * @param socket 
     * @param msg 
     * @param input 
     * @param ctx 
     */
    protected async pipeTo(socket: any, msg: Message, input: TInput): Promise<TMsg> {
        if (this.options.pipeTo) {
            await this.options.pipeTo(socket, msg, input)
        } else if (msg.data && this.options.write) {
            await this.streamAdapter.write(msg.data, this.streamAdapter.createWritable({
                write: (chunk, encoding, callback) => {
                    this.options.write!(socket, chunk, input, callback)
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
    protected async write(socket: any, msg: Message, input: TInput): Promise<TMsg> {
        if (this.options.write) {
            await promisify<any, any, any, void>(this.options.write, this.options)(socket, msg, input)
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
    protected handleMessage(): Observable<TMsg> {
        if (this.options.handleMessage) return this.options.handleMessage(this.socket, this.messageFactory).pipe(takeUntil(this.destroy$));

        return fromEvent(this.socket as IEventEmitter, this.options.messageEvent ?? ev.DATA, this.options.messageEventHandle ? this.options.messageEventHandle : (chunk) => {
            if (!isBuffer(chunk) && !this.streamAdapter.isReadable(chunk)) {
                chunk = Buffer.from(chunk);
            }
            return this.messageFactory.create({data: chunk});
        }).pipe(takeUntil(this.destroy$));
    }

}
