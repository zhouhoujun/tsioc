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
    abstract get secure(): boolean;
    /**
     * status of transport.
     */
    abstract get status(): TransportStatus;

    abstract normlizeUrl(url: string): string;
    abstract isAbsoluteUrl(url: string): boolean;

    abstract isEvent(req: RequestPacket): boolean;
    /**
     * url parse.
     * @param url 
     */
    abstract parse(req: IncomingPacket, proxy?: boolean): URL;
    /**
     * match protocol or not.
     * @param protocol 
     */
    abstract match(protocol: string): boolean;
}
