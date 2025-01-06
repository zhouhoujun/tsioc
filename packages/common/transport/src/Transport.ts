import { Injector } from '@tsdi/ioc';
import { HeaderAdapter, Packet } from '@tsdi/common';
import { Observable } from 'rxjs';
import { StatusAdapter } from './StatusAdapter';
import { StreamAdapter } from './StreamAdapter';
import { ClientIncoming, Incoming } from './Incoming';
import { ClientOutgoing, Outgoing } from './Outgoing';
import { IEventEmitter } from './stream';

/**
 * transport.
 */
export abstract class Transport<TSocket = any, TInput = any, TOutput = any> {
    /**
     * transport context injector.
     */
    abstract get injector(): Injector;

    /**
     * transport client side or not.
     */
    abstract get client(): boolean;
    
    /**
     * protocol
     */
    abstract get protocol(): string;

    /**
     * socket.
     */
    abstract get socket(): TSocket;
    /**
     * stream adapter.
     */
    abstract get streamAdapter(): StreamAdapter;
    /**
     * header adapter.
     */
    abstract get headerAdapter(): HeaderAdapter | null;
    /**
     * status adapter.
     */
    abstract get statusAdapter(): StatusAdapter | null;
    /**
     * send.
     * @param data 
     */
    abstract send(data: TInput, channel?: IEventEmitter): Observable<any>;

    /**
     * receive
     * @param channel the req channel.
     */
    abstract receive(channel: IEventEmitter): Observable<TOutput>;
    /**
     * close transport.
     */
    abstract close(): Promise<void>;
    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}


/**
 * Incoming messages
 */
export type Incomings = Packet<any> | Incoming<any> | ClientIncoming<any>;


/**
 * Outgoing messages
 */
export type Outgoings = Packet<any> | Outgoing<any> | ClientOutgoing<any>;


