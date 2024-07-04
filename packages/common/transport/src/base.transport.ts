import { Message, MessageFactory } from '@tsdi/common';
import { Decoder, Encoder } from '@tsdi/common/codings';
import { Injectable, promisify } from '@tsdi/ioc';
import { Observable, Subject, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
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
    write(socket: IWritableStream, msg: Message, origin: any, session: AbstractTransportSession): Promise<void> {
        if (session.streamAdapter.isReadable(msg.data)) {
            return session.streamAdapter.pipeTo(msg.data as IReadableStream, socket, { end: false });
        }
        return promisify<any, void>(socket.write, socket)(msg.data)
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
     * @param reqHost the host context of req.
     */
    receive(req?: TInput, reqHost?: any): Observable<TOutput> {
        return this.handleMessage(reqHost)
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
    protected sendMessage(msg: TMsg, input: TInput): Promise<any> | Observable<any> {
        return this.messageWriter.write(this.socket, msg, input, this)
    }

    /**
     * handle message
     */
    protected handleMessage(reqHost?: any): Observable<TMsg> {
        return this.messageReader.read(this.socket ?? reqHost, this.messageFactory, this)
            .pipe(
                takeUntil(this.destroy$)
            ) as Observable<any>;
    }

}


