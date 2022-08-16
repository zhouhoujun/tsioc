import { Abstract } from '@tsdi/ioc';
import { TransportStatus } from './status';
import { IncomingPacket, RequestPacket } from './packet';

/**
 * Listen options.
 */
 @Abstract()
 export abstract class ListenOpts {
 
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
 }
 

/**
 * transport adapter.
 */
@Abstract()
export abstract class TransportProtocol {
    /**
     * protocol name
     */
    abstract get protocol(): string;
    /**
     * status of transport.
     */
    abstract get status(): TransportStatus;

    abstract isAbsoluteUrl(url: string): boolean;

    abstract normlizeUrl(url: string, opts: ListenOpts): string;

    abstract isEvent(req: RequestPacket): boolean;

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
