import { Injector, ProvdierOf, Token } from '@tsdi/ioc';
import { HeaderAdapter, HybirdTransport, Transport } from '@tsdi/common';
import { CodingsAapter, CodingsHandlerOptions } from '@tsdi/common/codings';
import { Observable } from 'rxjs';
import { AbstractIncomingFactory, ClientIncoming, Incoming } from './Incoming';
import { StatusAdapter } from './StatusAdapter';
import { StreamAdapter } from './StreamAdapter';
import { TransportDecodingsFactory, TransportEncodingsFactory } from './condings';
import { AbstractOutgoingFactory, ClientOutgoing, Outgoing } from './Outgoing';
import { IEventEmitter } from './stream';



/**
 * transport options.
 */
export interface TransportOpts {
    /**
     * the codings action name.
     */
    name?: string;
    /**
     * subfix of group.
     */
    subfix?: string;

    encodings?: CodingsHandlerOptions;
    decodings?: CodingsHandlerOptions;

    encodingsAdapter?: ProvdierOf<CodingsAapter>;
    decodingsAdapter?: ProvdierOf<CodingsAapter>;
    /**
     * encodings Factory.
     */
    encodingsFactory?: Token<TransportEncodingsFactory>;
    /**
     * decodings Factory.
     */
    decodingsFactory?: Token<TransportDecodingsFactory>;

    /**
     * transport type.
     */
    transport?: Transport | HybirdTransport;
    /**
     * microservice or not.
     */
    microservice?: boolean;

    client?: boolean;

    defaultMethod?: string;

    serializeIgnores?: string[];

    /**
     * packet delimiter flag
     */
    delimiter?: string;

    /**
     * head delimiter flag
     */
    headDelimiter?: string;

    /**
     * content count number length.
     */
    countLen?: number;
    /**
     * id b
     */
    idLen?: number;
    /**
     * packet max size limit.
     */
    maxSize?: number;
    /**
     * encoding
     */
    encoding?: string;
    /**
     * timeout
     */
    timeout?: number;
    /**
     * close socket
     * @param socket 
     * @returns 
     */
    close?: (socket: any) => Promise<any>;

}


/**
 * base transport session.
 */
export abstract class AbstractTransportSession<TSocket = any, TInput = any, TOutput = any> {
    /**
     * socket.
     */
    abstract get socket(): TSocket;
    /**
     * transport options.
     */
    abstract get options(): TransportOpts;
    /**
     * session context.
     */
    abstract get injector(): Injector;
    /**
     * incoming message factory.
     */
    abstract get incomingFactory(): AbstractIncomingFactory;
    /**
     * outgoing message factory.
     */
    abstract get outgoingFactory(): AbstractOutgoingFactory;
    /**
     * stream adapter.
     */
    abstract get streamAdapter(): StreamAdapter;
    /**
     * header adapter.
     */
    abstract get headerAdapter(): HeaderAdapter;
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
     * @param req the message response for.
     */
    abstract receive(channel: IEventEmitter, req?: TInput): Observable<TOutput>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}


/**
 * Incoming messages
 */
export type Incomings = Incoming<any> | ClientIncoming<any>;


/**
 * Outgoing messages
 */
export type Outgoings = Outgoing<any> | ClientOutgoing<any>;


