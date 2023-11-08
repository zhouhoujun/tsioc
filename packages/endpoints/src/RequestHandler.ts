import { Abstract } from '@tsdi/ioc';
import { ServerTransportSession } from '@tsdi/common';
import { Logger } from '@tsdi/logger';
import { Subscription } from 'rxjs';
import { TransportEndpoint } from './TransportEndpoint';
import { TransportContext } from './TransportContext';
import { ServerOpts } from './Server';

/**
 * request handle
 */
@Abstract()
export abstract class RequestHandler<TRequest = any, TResponse = any> {
    /**
     * handle request.
     */
    abstract handle(endpoint: TransportEndpoint<TransportContext<TRequest, TResponse>>, session: ServerTransportSession, logger: Logger, options: ServerOpts): Subscription;
}
