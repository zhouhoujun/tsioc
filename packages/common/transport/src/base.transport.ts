import { Message, MessageFactory } from '@tsdi/common';
import { Decoder, Encoder } from '@tsdi/common/codings';
import { Injectable, promisify } from '@tsdi/ioc';
import { Observable, Subject, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
import { StreamAdapter } from './StreamAdapter';
import { AbstractTransportSession, MessageReader, MessageWriter } from './TransportSession';
import { ev } from './consts';
import { IReadableStream, IWritableStream } from './stream';


@Injectable()
export class SocketMessageReader implements MessageReader<IWritableStream> {
    read(socket: IWritableStream, messageFactory: MessageFactory, session: BaseTransportSession): Observable<Message> {
        return fromEvent(socket, ev.DATA, (chunk: Buffer | string) => {
            return messageFactory.create({ data: chunk });
        })
    }
}

@Injectable()
export class SocketMessageWriter implements MessageWriter<IWritableStream> {
    write(socket: IWritableStream, msg: Message): Promise<void> {
        return promisify<any, void>(socket.write, socket)(msg.data)
    }

    writeStream(socket: IWritableStream, msg: Message, streamAdapter: StreamAdapter) {
        return streamAdapter.pipeTo(msg.data as IReadableStream, socket, { end: false });
    }
}

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
    send(data: TInput): Observable<any> {
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
    protected sendMessage(msg: TMsg, input: TInput): Promise<void> | Observable<void> {
        if (this.streamAdapter.isReadable(msg.data)) {
            return this.messageWriter.writeStream(this.socket, msg, this.streamAdapter)
        } else {
            return this.messageWriter.write(this.socket, msg);
        }
    }

    /**
     * handle message
     */
    protected handleMessage(): Observable<TMsg> {
        return this.messageReader.read(this.socket, this.messageFactory, this)
            .pipe(
                takeUntil(this.destroy$)
            ) as Observable<any>;
    }

}

