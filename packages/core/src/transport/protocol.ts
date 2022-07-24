import { Abstract } from '@tsdi/ioc';
import { IncomingPacket } from './packet';
import { Redirector } from './redirector';
import { TransportStatus } from './status';

@Abstract()
export abstract class Protocol {
    /**
     * protocol name
     */
    abstract get name(): string;
    abstract normlizeUrl(url: string): string;
    abstract isAbsoluteUrl(url: string): boolean;
    abstract get secure(): boolean;

    /**
     * url parse.
     * @param url 
     */
    abstract parse(req: IncomingPacket, proxy?: boolean): URL;
    abstract match(protocol: string): boolean;

    /**
     * status of transport.
     */
    abstract get status(): TransportStatus;
    /**
     * redirector
     */
    abstract get redirector(): Redirector;
}
