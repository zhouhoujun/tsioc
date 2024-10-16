import { Abstract, Injectable, promisify } from '@tsdi/ioc';
import { Packet } from '@tsdi/common';
import { Decoder, Encoder } from '@tsdi/common/codings';
import { Observable, Subject, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
import { AbstractTransportSession, Incomings, Outgoings } from './TransportSession';
import { ev } from './consts';
import { IEventEmitter, IReadableStream, IWritableStream } from './stream';

/**
 * message reader.
 */
@Abstract()
export abstract class MessageReader<TSocket = any, TChannel extends IEventEmitter = IEventEmitter, TMsg = any, TSession extends AbstractTransportSession = AbstractTransportSession> {
    abstract read(socket: TSocket, channel: TChannel | null | undefined, session: TSession): Observable<TMsg>
}

/**
 * message writer.
 */
@Abstract()
export abstract class MessageWriter<TSocket = any, TChannel extends IEventEmitter = IEventEmitter, TMsg = any, TOrigin = any, TSession extends AbstractTransportSession = AbstractTransportSession> {
    abstract write(socket: TSocket, channel: TChannel | null | undefined, msg: TMsg, origin: TOrigin, session: TSession): Promise<any>;
}



@Injectable()
export class SocketMessageReader implements MessageReader<IReadableStream> {
    read(socket: IReadableStream, channel: IEventEmitter, session: AbstractTransportSession): Observable<Packet<Buffer|string>> {
        return fromEvent(channel ?? socket, ev.DATA, (chunk: Buffer | string) => {
            return session.incomingFactory.create({ data: chunk });
        })
    }
}

@Injectable()
export class SocketMessageWriter implements MessageWriter<IWritableStream> {
    write(socket: IWritableStream, channel: IEventEmitter, msg: Packet<Buffer|string>, origin: any, session: AbstractTransportSession): Promise<void> {
        if (session.streamAdapter.isReadable(msg.payload)) {
            return session.streamAdapter.pipeTo(msg.payload as IReadableStream, socket, { end: false });
        }
        return promisify<any, void>(socket.write, socket)(msg.payload)
    }
}

/**
 * base transport session via codings.
 */
export abstract class BaseTransportSession<TSocket = any, TInput = any, TOutput = any> extends AbstractTransportSession<TSocket, TInput, TOutput> {

    
    /**
     * message reader.
     */
    abstract get messageReader(): MessageReader;

    /**
     * message writer.
     */
    abstract get messageWriter(): MessageWriter;

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
     * @param incoming the req channel.
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
    protected sendMessage(channel: IEventEmitter | null | undefined, msg: Outgoings, input: TInput): Promise<any> | Observable<any> {
        return this.messageWriter.write(this.socket, channel, msg, input, this)
    }

    /**
     * handle message
     */
    protected handleMessage(channel?: IEventEmitter): Observable<Incomings> {
        return this.messageReader.read(this.socket, this.streamAdapter.isEventEmitter(channel) ? channel : null, this)
            .pipe(
                takeUntil(this.destroy$)
            ) as Observable<any>;
    }

}


