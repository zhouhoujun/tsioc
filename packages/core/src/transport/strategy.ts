import { Abstract, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { EndpointContext } from './context';
import { Endpoint } from './endpoint';
import { Incoming } from './packet';
import { TransportStatus } from './status';
import { TransportEndpoint, TransportOpts } from './transport';


@Abstract()
export abstract class Sender<TInput = any, TOutput = any, TConn = any> extends TransportEndpoint<TInput, TOutput> {
    /**
     * transform, send data to remoting.
     * @param input 
     * @param context 
     * @returns 
     */
    abstract send(conn: TConn, input: TInput, context: EndpointContext): Observable<TOutput>;
}

@Abstract()
export abstract class Receiver<TInput = any, TOutput = any, TConn = any> extends TransportEndpoint<TInput, TOutput> {
    /**
     * transform, receive data from remoting.
     * @param conn connection
     * @param endpoint as backend endpoint form receive.
     */
    abstract receive(conn: TConn, endpoint: Endpoint): Observable<TOutput>;
}

@Abstract()
export abstract class SenderOpts<TInput = any, TOutput = any> extends TransportOpts<TInput, TOutput> {
    [K: string]: any;
    abstract sender?: TypeOf<Sender>;
}

@Abstract()
export abstract class ReceiverOpts<TInput = any, TOutput = any> extends TransportOpts<TInput, TOutput> {
    [K: string]: any;
    abstract receiver?: TypeOf<Receiver>;
}

@Abstract()
export abstract class TransportStrategyOpts {
    abstract get strategy(): TypeOf<TransportStrategy>;
    abstract senderOpts?: SenderOpts;
    abstract receiverOpts?: ReceiverOpts;
}



/**
 * transport strategy.
 */
@Abstract()
export abstract class TransportStrategy<T = number | string> extends TransportStatus<T> {
    /**
     * protocol name
     */
    abstract get protocol(): string;

    /**
     * the url is absolute url or not.
     * @param url 
     */
    abstract isAbsoluteUrl(url: string): boolean;
    /**
     * is update modle resquest.
     */
    abstract isUpdate(incoming: Incoming): boolean;
    /**
     * is secure or not.
     * @param incoming 
     */
    abstract isSecure(incoming: Incoming): boolean;
    /**
     * url parse.
     * @param url 
     */
    abstract parseURL(incoming: Incoming, opts: ListenOpts, proxy?: boolean): URL;
    /**
     * match protocol or not.
     * @param protocol 
     */
    abstract match(protocol: string): boolean;

    /**
     * status changed event.
     */
    abstract get statusChanged(): Observable<T>;

}



/**
 * Listen options.
 */
@Abstract()
export abstract class ListenOpts {

    [x: string]: any;

    /**
    * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
    */
    signal?: AbortSignal | undefined;
    port?: number | undefined;
    host?: string | undefined;
    backlog?: number | undefined;
    path?: string | undefined;
    exclusive?: boolean | undefined;
    readableAll?: boolean | undefined;
    writableAll?: boolean | undefined;
    /**
     * @default false
     */
    ipv6Only?: boolean | undefined;
    withCredentials?: boolean;
}
