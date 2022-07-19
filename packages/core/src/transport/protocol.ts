import { Abstract } from '@tsdi/ioc';
import { Protocol } from './packet';
import { TransportStatus } from './status';

@Abstract()
export abstract class TransportProtocol {
    /**
     * protocol name.
     */
    abstract get protocol(): Protocol;
    /**
     * status of transport.
     */
    abstract get status(): TransportStatus;

    abstract parseURL(url: string): URL;
}
