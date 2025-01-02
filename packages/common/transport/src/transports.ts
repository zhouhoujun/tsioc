import { Abstract, isFunction, promisify } from '@tsdi/ioc';
import { AbstractRequest } from '@tsdi/common';
import { Observable, Subject, fromEvent, mergeMap, share, takeUntil } from 'rxjs';
import { Transport } from './Transport';
import { ev } from './consts';
import { IEventEmitter, IReadable, IWritable } from './stream';
import { AbstractIncomingFactory } from './Incoming';
import { AbstractOutgoingFactory } from './Outgoing';
import { Deserializer } from './Deserializer';
import { Serializer } from './Serializer';
import { TransportContext } from './context';

/**
 * Abstract transport.
 */
@Abstract()
export abstract class AbstractTransport<TSocket = any, TInput = any, TOutput = any> extends Transport<TSocket, TInput, TOutput> {

    /**
     * message deserializer.
     */
    abstract get deserializer(): Deserializer;

    /**
     * message encodings.
     */
    abstract get serializer(): Serializer;

    /**
     * incoming message factory.
     */
    abstract get incomingFactory(): AbstractIncomingFactory;
    /**
     * outgoing message factory.
     */
    abstract get outgoingFactory(): AbstractOutgoingFactory;



    protected destroy$ = new Subject<void>;

    /**
     * send.
     * @param data 
     */
    send(data: TInput, channel?: IEventEmitter): Observable<any> {
        return this.serializer.serialize(data, new TransportContext(this, data))
            .pipe(
                mergeMap(msg => {
                    return this.write(msg, channel)
                }),
                takeUntil(this.destroy$)
            )
    }

    /**
     * receive
     * @param incoming the req channel.
     * @param req the message response for.
     */
    receive(channel?: IEventEmitter, req?: AbstractRequest<any>): Observable<TOutput> {
        return this.read(channel, req)
            .pipe(
                takeUntil(this.destroy$),
                mergeMap(data => this.deserializer.deserialize(data, new TransportContext(this, req))),
                share()
            ) as Observable<any>;
    }

    protected abstract read(channel?: IEventEmitter | null, req?: AbstractRequest<any>): Observable<any>;

    protected abstract write(msg: any, channel?: IEventEmitter | null): Promise<any> | Observable<any>;

    /**
     * destroy.
     */
    async destroy(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();
        await this.close();
    }

}

@Abstract()
export abstract class SocketTransport<TSocket extends IWritable = IWritable, TInput = any, TOutput = any> extends AbstractTransport<TSocket, TInput, TOutput> {

    protected override read(channel?: IEventEmitter | null, req?: AbstractRequest<any>): Observable<any> {
        return fromEvent(channel ?? this.socket, ev.DATA)
    }

    protected override write(msg: any, channel?: IWritable | null): Promise<any> {

        const socket = channel ?? this.socket;
        if (this.streamAdapter.isReadable(msg.payload)) {
            return this.streamAdapter.pipeTo(msg.payload as IReadable, socket, { end: false });
        }
        return promisify<any, void>(socket.write, socket)(msg.payload)
    }

    override async close() {
        const socket = this.socket as any;
        if (socket && isFunction(socket.close)) {
            await promisify(socket.close, socket)();
        }
    }

}