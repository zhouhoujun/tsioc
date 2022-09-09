import { Abstract } from '@tsdi/ioc';
import { TransportStatus } from './status';
import { IncomingPacket, Packet } from './packet';

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


/**
 * protocol strategy.
 */
@Abstract()
export abstract class ProtocolStrategy {
    /**
     * protocol name
     */
    abstract get protocol(): string;
    /**
     * status of transport.
     */
    abstract get status(): TransportStatus;
    /**
     * the url is absolute url or not.
     * @param url 
     */
    abstract isAbsoluteUrl(url: string): boolean;
    /**
     * is update modle resquest.
     */
    abstract isUpdate(incoming: IncomingPacket): boolean;
    /**
     * is secure or not.
     * @param incoming 
     */
    abstract isSecure(incoming: IncomingPacket): boolean;
    /**
     * url parse.
     * @param url 
     */
    abstract parse(incoming: IncomingPacket, opts: ListenOpts, proxy?: boolean): URL;
    /**
     * match protocol or not.
     * @param protocol 
     */
    abstract match(protocol: string): boolean;
}
