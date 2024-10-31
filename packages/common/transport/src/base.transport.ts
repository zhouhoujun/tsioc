import { Abstract, Injectable, promisify } from '@tsdi/ioc';
import { Decoder, Encoder } from '@tsdi/common/codings';
import { Observable, Subject, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
import { AbstractTransportSession, Incomings, Outgoings } from './TransportSession';
import { ev } from './consts';
import { IEventEmitter, IReadableStream, IWritableStream } from './stream';

/**
 * message reader.
 */
@Abstract()
export abstract class MessageReader<TSocket = any, TChannel extends IEventEmitter = IEventEmitter, TMsg = any> {
    abstract read(socket: TSocket, channel: TChannel | null | undefined, session: AbstractTransportSession): Observable<TMsg>
}

/**
 * message writer.
 */
@Abstract()
export abstract class MessageWriter<TSocket = any, TChannel extends IEventEmitter = IEventEmitter, TMsg = any> {
    abstract write(socket: TSocket, channel: TChannel | null | undefined, msg: TMsg, session: AbstractTransportSession): Observable<any>;
}



@Injectable()
export class SocketMessageReader implements MessageReader<IReadableStream> {
    constructor(readonly decodings: Decoder) { }

    read(socket: IReadableStream, channel: IEventEmitter, session: AbstractTransportSession): Observable<Incomings> {
        return fromEvent(channel ?? socket, ev.DATA, (chunk: Buffer | string) => {
            return session.incomingFactory.create({ data: chunk });
        })
            .pipe(mergeMap(data => this.decodings.decode(origin)))
    }
}

@Injectable()
export class SocketMessageWriter implements MessageWriter<IWritableStream> {

    constructor(readonly encodings: Encoder) { }

    write(socket: IWritableStream, channel: IEventEmitter, msg: any, session: AbstractTransportSession): Observable<any> {
        return this.encodings.encode(msg)
            .pipe(
                mergeMap(msg => {
                    if (session.streamAdapter.isReadable(msg.payload)) {
                        return session.streamAdapter.pipeTo(msg.payload as IReadableStream, socket, { end: false });
                    }
                    return promisify<any, void>(socket.write, socket)(msg.payload)
                }))
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


    protected destroy$ = new Subject<void>;

    /**
     * send.
     * @param data 
     */
    send(data: TInput, channel?: IEventEmitter): Observable<any> {
        return this.messageWriter.write(this.socket, channel, data, this)
            .pipe(
                takeUntil(this.destroy$)
            )
    }

    /**
     * receive
     * @param incoming the req channel.
     * @param req the message response for.
     */
    receive(channel?: IEventEmitter): Observable<TOutput> {
        return this.messageReader.read(this.socket, this.streamAdapter.isEventEmitter(channel) ? channel : null, this)
            .pipe(
                takeUntil(this.destroy$),
                share()
            ) as Observable<any>;
    }

    /**
     * destroy.
     */
    async destroy(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();
    }

}


