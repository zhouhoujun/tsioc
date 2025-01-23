import { Abstract } from '@tsdi/ioc';
import { AbstractRequest, PatternFormatter } from '@tsdi/common';
import { Observable, Subject, mergeMap, share, takeUntil } from 'rxjs';
import { Transport } from './Transport';
import { IEventEmitter } from './stream';
import { AbstractIncomingFactory, Incoming } from './Incoming';
import { Deserializer } from './Deserializer';
import { Serializer } from './Serializer';
import { TransportContext } from './context';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { Packet } from './socket';


export interface TransportOptions {
    delimiter?: string;
    headDelimiter?: string;
    maxSize?: number;
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
    event?: string;
    serializerConfig?: ConfigableHandlerOptions;
    deserializerConfig?: ConfigableHandlerOptions;
    transferConfig?: ConfigableHandlerOptions;
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
    receive(channel?: IEventEmitter, req?: AbstractRequest<any>): Observable<TIncoming> {
        return this.read(channel, req)
            .pipe(
                takeUntil(this.destroy$),
                mergeMap(data => this.deserializer.deserialize(data, new TransportContext(this, req))),
                share()
            ) as Observable<any>;
    }

    protected abstract read(channel?: IEventEmitter | null, req?: AbstractRequest<any>): Observable<any>;

    protected abstract write(msg: Packet, channel?: IEventEmitter | null): Promise<any> | Observable<any>;

    /**
     * destroy.
     */
    async destroy(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();
        await this.close();
    }

}
