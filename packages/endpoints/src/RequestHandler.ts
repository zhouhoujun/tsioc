import { Abstract } from '@tsdi/ioc';
import { TransportSession } from '@tsdi/common';
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
    abstract handle(endpoint: TransportEndpoint<TransportContext<TRequest, TResponse>>, session: TransportSession, logger: Logger, options: ServerOpts): Subscription;
}
