import { Abstract, promisify } from '@tsdi/ioc';
import { Observable, Subject, mergeMap, share, takeUntil } from 'rxjs';
import { Transport } from './Transport';
import { IEventEmitter, IReadable, IWritable } from './stream';
import { AbstractIncomingFactory, Incoming } from './Incoming';
import { Deserializer } from './Deserializer';
import { Serializer } from './Serializer';
import { TransportContext } from './context';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { Packet } from './socket';
import { StreamAdapter } from './StreamAdapter';
import { Protocols } from '@tsdi/common';


export interface TransportOptions {
    delimiter?: Buffer;
    /**
     * message max size limit
     */
    maxSize?: number;
    /**
     * packet size limit.
     */
    limit?: number;
    /**
     * packet id buffer length
     */
    idLen?: number;
    /**
     * packet size buffer length
     */
    countLen?: number;
    /**
     * header length.
     */
    headLen?: number;
    serializerConfig?: ConfigableHandlerOptions;
    deserializerConfig?: ConfigableHandlerOptions;
    transferConfig?: ConfigableHandlerOptions;

    getResponseTopic?(topic: string): string;
}

/**
 * Abstract transport.
 */
@Abstract()
export abstract class AbstractTransport<TSocket = any, TIncoming extends Incoming = Incoming, TOutgoing = any> extends Transport<TSocket, TIncoming, TOutgoing> {

    /**
     * message encodings.
     */
    abstract get serializer(): Serializer<TOutgoing, Packet>;
    /**
     * message deserializer.
     */
    abstract get deserializer(): Deserializer<Packet, TIncoming>;

    /**
     * incoming message factory.
     */
    abstract get incomingFactory(): AbstractIncomingFactory;
    /**
     * transport options
     */
    abstract get options(): TransportOptions;

    protected destroy$ = new Subject<void>;

    /**
     * send.
     * @param data 
     */
    send(data: TOutgoing, channel?: IEventEmitter): Observable<any> {
        return this.serializer.serialize(data, new TransportContext(this, data))
            .pipe(
                mergeMap(msg => {
                    return this.write(msg, data, channel)
                }),
                takeUntil(this.destroy$)
            )
    }

    /**
     * receive
     * @param incoming the channel.
     * @param origin the origin message.
     */
    receive(channel?: IEventEmitter, origin?: TOutgoing): Observable<TIncoming> {
        return this.read(channel, origin)
            .pipe(
                takeUntil(this.destroy$),
                mergeMap(data => this.deserializer.deserialize(data, new TransportContext(this, origin))),
                share()
            ) as Observable<any>;
    }

    protected abstract read(channel?: IEventEmitter | null, origin?: TOutgoing): Observable<any>;

    protected abstract write(msg: Packet, origin:TOutgoing, channel?: IEventEmitter | null): Promise<any> | Observable<any>;

    /**
     * destroy.
     */
    async destroy(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();
        await this.close();
    }

}

export function writePacket(socket: IWritable, msg: Packet, streamAdapter: StreamAdapter): Promise<void> {
    if (streamAdapter.isReadable(msg.payload)) {
        return streamAdapter.pipeTo(msg.payload as IReadable, socket, { end: false });
    }
    return promisify<any, void>(socket.write, socket)(msg.payload)
}

export function toTransportModuleName(transport: Protocols) {
    if (/^(https|mqtts|wss)$/.test(transport)) {
        return transport.slice(0, transport.length - 1);
    }
    return transport;
}



const microservices = {
    mqtt: true,
    mqtts: true,
    redis: true,
    kafka: true,
    nats: true,
    amqp: true,
    ws: true,
    wss: true,
    udp: true
} as Record<Protocols, boolean>;

export function isMicroTransport(options: {transport: Protocols, microservice?: boolean }) {
    return microservices[options.transport] || (options.transport == 'tcp' && options.microservice === true)
}