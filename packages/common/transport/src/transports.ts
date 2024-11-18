import { Abstract, Injectable, isFunction, promisify } from '@tsdi/ioc';
import { AbstractRequest } from '@tsdi/common';
import { Decoder, Encoder } from '@tsdi/common/codings';
import { Observable, Subject, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
import { Transport, Incomings } from './Transport';
import { ev } from './consts';
import { IEventEmitter, IReadableStream, IWritableStream } from './stream';

/**
 * message reader.
 */
@Abstract()
export abstract class MessageReader<TSocket = any, TChannel extends IEventEmitter = IEventEmitter, TMsg = any> {
    abstract read(transport: Transport<TSocket>, channel?: TChannel | null, req?: AbstractRequest<any>): Observable<TMsg>
}

/**
 * message writer.
 */
@Abstract()
export abstract class MessageWriter<TSocket = any, TChannel extends IEventEmitter = IEventEmitter, TMsg = any> {
    abstract write(transport: Transport<TSocket>, msg: TMsg, channel?: TChannel | null): Observable<any>;
}



@Injectable()
export class SocketMessageReader implements MessageReader<IReadableStream> {
    constructor(readonly decodings: Decoder) { }

    read(transport: Transport, channel?: IEventEmitter, req?: AbstractRequest<any>): Observable<Incomings> {
        return fromEvent(channel ?? transport.socket, ev.DATA, (chunk: Buffer | string) => {
            return transport.incomingFactory.create({ data: chunk });
        })
            .pipe(mergeMap(data => this.decodings.decode(data, req)))
    }
}

@Injectable()
export class SocketMessageWriter<TMsg = any> implements MessageWriter<IWritableStream, IEventEmitter, TMsg> {

    constructor(readonly encodings: Encoder) { }

    write(transport: Transport, data: any, channel?: IEventEmitter): Observable<any> {
        return this.encodings.encode(data)
            .pipe(
                mergeMap(msg => {
                    const socket = channel ?? transport.socket;
                    if (transport.streamAdapter.isReadable(msg.payload)) {
                        return transport.streamAdapter.pipeTo(msg.payload as IReadableStream, socket, { end: false });
                    }
                    return promisify<any, void>(socket.write, socket)(msg.payload)
                }))
    }
}

/**
 * Abstract transport.
 */
export abstract class AbstractTransport<TSocket = any, TInput = any, TOutput = any> extends Transport<TSocket, TInput, TOutput> {

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
        return this.messageWriter.write(this, data, channel)
            .pipe(
                takeUntil(this.destroy$)
            )
    }

    /**
     * receive
     * @param incoming the req channel.
     * @param req the message response for.
     */
    receive(channel?: IEventEmitter, req?: AbstractRequest<any>): Observable<TOutput> {
        return this.messageReader.read(this, channel, req)
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
        await this.close();
    }

    override async close() {
        const socket = this.socket as any;
        if (socket && isFunction(socket.close)) {
            await promisify(socket.close, socket)();
        }
    }

}
