import { Abstract, promisify } from '@tsdi/ioc';
import { Protocols } from '@tsdi/common';
import { Observable, Subject, map, mergeMap, share, takeUntil } from 'rxjs';
import { Transport } from './Transport';
import { IReadable, IWritable } from './stream';
import { AbstractIncomingFactory, Incoming } from './Incoming';
import { Deserializer } from './Deserializer';
import { Serializer } from './Serializer';
import { TransportContext } from './context';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { Packet } from './socket';
import { StreamAdapter } from './StreamAdapter';



export interface TransportOptions {
    /**
     * for custom unpacking and packing
     */
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

    getResponseTopic?(topic: string): string;
}

/**
 * transport configure.
 */
export interface TransportConfigure {
    
    /**
     * transport options.
     */
    transportOptions?: TransportOptions;
    /**
     * serialize config.
     */    
    serializerConfig?: ConfigableHandlerOptions;
    /**
     * deserialize config.
     */
    deserializerConfig?: ConfigableHandlerOptions;
    /**
     * transfer config.
     */
    transferConfig?: ConfigableHandlerOptions;
}

/**
 * Abstract transport.
 */
@Abstract()
export abstract class AbstractTransport<
    TSocket = any,
    TIncoming extends Incoming = Incoming,
    TOutgoing = any,
    TMsg = any> extends Transport<TSocket, TIncoming, TOutgoing> {

    /**
     * message encodings.
     */
    abstract get serializer(): Serializer<TOutgoing, TMsg>;
    /**
     * message deserializer.
     */
    abstract get deserializer(): Deserializer<TMsg, TIncoming>;

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
    send(data: TOutgoing, context?: TransportContext): Observable<any> {
        if (!context) {
            context = TransportContext.create(this)
        }
        this.initSendContext(context, data);
        return this.serializer.serialize(data, context)
            .pipe(
                mergeMap(msg => {
                    return this.write(msg, data, context!)
                }),
                takeUntil(this.destroy$)
            )
    }



    /**
     * receive
     * @param incoming the channel.
     * @param origin the origin message.
     */
    receive(context?: TransportContext): Observable<TIncoming> {
        if (!context) {
            context = TransportContext.create(this)
        }
        this.initReceiveContext(context)
        return this.read(context)
            .pipe(
                takeUntil(this.destroy$),
                mergeMap(data => this.deserializer.deserialize(data, context!)),
                map(incoming => {
                    incoming.context = context;
                    return incoming;
                }),
                share()
            ) as Observable<any>;
    }

    protected abstract read(context: TransportContext): Observable<any>;

    protected abstract write(msg: TMsg, origin: TOutgoing, context: TransportContext): Promise<any> | Observable<any>;

    protected initSendContext(context: TransportContext, data: TOutgoing): void {

    }

    protected initReceiveContext(context: TransportContext): void {

    }

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

export function isMicroTransport(options: { transport: Protocols, microservice?: boolean }) {
    return microservices[options.transport] || (options.transport == 'tcp' && options.microservice === true)
}