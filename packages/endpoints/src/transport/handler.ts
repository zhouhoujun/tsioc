import { Injectable } from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import { RequestPacket, ResponsePacket } from '@tsdi/common';
import { finalize, mergeMap } from 'rxjs';
import { RequestHandler } from '../RequestHandler';
import { TransportEndpoint } from '../TransportEndpoint';
import { ServerOpts } from '../Server';
import { ServerTransportSession } from './session';


@Injectable()
export class DefaultRequestHandler implements RequestHandler<RequestPacket, ResponsePacket> {

    handle(endpoint: TransportEndpoint, session: ServerTransportSession<any>, logger: Logger, options: ServerOpts) {

        return session.receive(options).pipe(
            mergeMap(context => {

                context.setValue(Logger, logger);

                return endpoint.handle(context)
                    .pipe(
                        finalize(() => {
                            context.destroy();
                        }))
            })
        ).subscribe({
            error(err) {
                logger.error(err);
            },
        });

    }

}
