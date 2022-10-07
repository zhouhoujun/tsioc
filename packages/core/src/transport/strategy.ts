import { Abstract, Token, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { EndpointContext } from './context';
import { Incoming } from './packet';
import { TransportStatus } from './status';
import { TransportEndpoint, TransportOpts } from './transport';



@Abstract()
export abstract class Transformer<TInput = any, TOutput = any> extends TransportEndpoint<TInput, TOutput> {
    /**
     * transform, send data to remoting.
     * @param input 
     * @param context 
     * @returns 
     */
    transform(input: TInput, context: EndpointContext): Observable<TOutput> {
        return this.endpoint().handle(input, context);
    }
}


@Abstract()
export abstract class TransportStrategyOpts<TInput = any, TOutput = any> extends TransportOpts<TInput, TOutput> {
    [K: string]: any;
    abstract get strategy(): TypeOf<TransportStrategy>;
}



/**
 * transport strategy.
 */
@Abstract()
export abstract class TransportStrategy {
    /**
     * protocol name
     */
    abstract get protocol(): string;
    /**
     * transport status.
     */
    abstract get status(): TransportStatus;
    /**
     * transformor.
     */
    abstract get transformer(): Transformer;

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
