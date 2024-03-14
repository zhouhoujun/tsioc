import { Injectable } from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import { GET, MESSAGE, RequestPacket, ResponsePacket, TransportSession } from '@tsdi/common';
import { RequestHandler, ServerOpts, RequestContextFactory, EndpointHandler } from '@tsdi/endpoints';
import { finalize, mergeMap } from 'rxjs';


@Injectable()
export class JsonRequestHandler implements RequestHandler<RequestPacket, ResponsePacket> {

    handle(endpoint: EndpointHandler, session: TransportSession<any>, logger: Logger, options: ServerOpts) {

        return session.receive().pipe(
            mergeMap(req => {
                if (!req.method) {
                    req.method = options.transportOpts?.microservice ? MESSAGE : GET;
                }
                const injector = endpoint.injector;
                const ctx = injector.get(RequestContextFactory).create(injector, session, req, {}, options);
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
