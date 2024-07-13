import { Injectable, promisify } from '@tsdi/ioc';
import { BaseMessage, Message } from '@tsdi/common';
import { Decoder, Encoder } from '@tsdi/common/codings';
import { Observable, Subject, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
import { AbstractTransportSession, MessageReader, MessageWriter } from './TransportSession';
import { ev } from './consts';
import { IEventEmitter, IReadableStream, IWritableStream } from './stream';


@Injectable()
export class SocketMessageReader implements MessageReader<IReadableStream> {
    read(socket: IReadableStream, channel: IEventEmitter, session: AbstractTransportSession): Observable<Message> {
        return fromEvent(channel ?? socket, ev.DATA, (chunk: Buffer | string) => {
            if (!session.messageFactory) return new BaseMessage({ data: chunk })
            return session.messageFactory.create({ data: chunk });
        })
    }
}

@Injectable()
export class SocketMessageWriter implements MessageWriter<IWritableStream> {
    write(socket: IWritableStream, channel: IEventEmitter, msg: Message, origin: any, session: AbstractTransportSession): Promise<void> {
        if (session.streamAdapter.isReadable(msg.data)) {
            return session.streamAdapter.pipeTo(msg.data as IReadableStream, socket, { end: false });
        }
        return promisify<any, void>(socket.write, socket)(msg.data)
    }
}

/**
 * base transport session via codings.
 */
export abstract class BaseTransportSession<TSocket = any, TInput = any, TOutput = any, TMsg = any> extends AbstractTransportSession<TSocket, TInput, TOutput> {

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
    send(data: TInput, channel?: IEventEmitter): Observable<any> {
        return this.encodings.encode(data)
            .pipe(
                mergeMap(encoded => this.sendMessage(channel, encoded, data)),
                takeUntil(this.destroy$),
                share()
            )
    }

    /**
     * receive
     * @param channel the req channel.
     * @param req the message response for.
     */
    receive(channel?: IEventEmitter, req?: TInput): Observable<TOutput> {
        return this.handleMessage(channel)
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
    protected sendMessage(channel: IEventEmitter | null | undefined, msg: TMsg, input: TInput): Promise<any> | Observable<any> {
        return this.messageWriter.write(this.socket, channel, msg, input, this)
    }

    /**
     * handle message
     */
    protected handleMessage(channel?: IEventEmitter): Observable<TMsg> {
        return this.messageReader.read(this.socket, this.streamAdapter.isEventEmitter(channel) ? channel : null, this)
            .pipe(
                takeUntil(this.destroy$)
            ) as Observable<any>;
    }

}


