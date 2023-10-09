import { Injectable } from '@tsdi/ioc';
import { RequestPacket, ResponsePacket, TransportSession } from '@tsdi/common';
import { Logger } from '@tsdi/logger';
import { RequestHandler, ServerOpts, TransportEndpoint, createTransportContext } from '@tsdi/endpoints';
import { finalize, mergeMap } from 'rxjs';


@Injectable()
export class AssetRequestHandler implements RequestHandler<RequestPacket, ResponsePacket> {

    handle(endpoint: TransportEndpoint, session: TransportSession<any>, logger: Logger, options: ServerOpts) {

        return session.receive().pipe(
            mergeMap(req => {
                if (!req.method && options?.defaultMethod) {
                    req.method = options?.defaultMethod;
                }
                const ctx = createTransportContext(endpoint.injector, req, {});
                ctx.setValue(TransportSession, session);
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