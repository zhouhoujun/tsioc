import { Injector } from '@tsdi/ioc';
import { HeaderAdapter } from '@tsdi/common';
import { Observable } from 'rxjs';
import { StatusAdapter } from './StatusAdapter';
import { StreamAdapter } from './StreamAdapter';
import { Incoming } from './Incoming';
import { TransportContext } from './context';

/**
 * transport.
 */
export abstract class Transport<TSocket = any, TIncoming extends Incoming = Incoming, TOutgoing = any> {
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
     * @param context transport context 
     */
    abstract send(data: TOutgoing, context?: TransportContext): Observable<any>;

    /**
     * receive
     * @param context transport context 
     */
    abstract receive(context?: TransportContext): Observable<TIncoming>;
    /**
     * close transport.
     */
    abstract close(): Promise<void>;
    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}

