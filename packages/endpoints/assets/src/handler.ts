import { Injectable } from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import { GET, MESSAGE, RequestPacket, ResponsePacket, TransportSession } from '@tsdi/common';
import { AssetContextFactory, RequestHandler, ServerOpts, TransportEndpoint } from '@tsdi/endpoints';
import { finalize, mergeMap } from 'rxjs';


/**
 * Asset request handler.
 */
@Injectable()
export class AssetRequestHandler implements RequestHandler<RequestPacket, ResponsePacket> {

    handle(endpoint: TransportEndpoint, session: TransportSession, logger: Logger, options: ServerOpts) {

        return session.receive().pipe(
            mergeMap(incoming => {
                if (!incoming.method) {
                    incoming.method = options.transportOpts?.microservice ? MESSAGE : GET;
                }
                
                const injector = endpoint.injector;
                const ctx = injector.get(AssetContextFactory).create(injector, session, incoming, options);
                ctx.setValue(Logger, logger);

                return endpoint.handle(ctx)
                    .pipe(
                        finalize(() => {
                            ctx.destroy();
                        }))
            })
        ).subscribe({
            error(err) {
                logger.error(err);
            },
        });

    }

}
