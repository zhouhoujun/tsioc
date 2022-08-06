import { Abstract } from '@tsdi/ioc';
import { IncomingPacket, RequestPacket } from './packet';
import { TransportStatus } from './status';

/**
 * protocol for transport.
 */
@Abstract()
export abstract class Protocol {
    /**
     * protocol name
     */
    abstract get name(): string;
    /**
     * status of transport.
     */
    abstract get status(): TransportStatus;

    abstract isAbsoluteUrl(url: string): boolean;

    abstract normlizeUrl(url: string): string;
    
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
    abstract parse(incoming: IncomingPacket, proxy?: boolean): URL;
    /**
     * match protocol or not.
     * @param protocol 
     */
    abstract match(protocol: string): boolean;
}
