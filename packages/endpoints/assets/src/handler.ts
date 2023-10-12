import { Injectable, Injector } from '@tsdi/ioc';
import { GET, IncomingPacket, MESSAGE, RequestPacket, ResponsePacket, TransportSession } from '@tsdi/common';
import { Logger } from '@tsdi/logger';
import { AssetContext, RequestHandler, ServerOpts, TransportEndpoint } from '@tsdi/endpoints';
import { finalize, mergeMap } from 'rxjs';
import { AssetContextImpl } from './impl/context';
import { IncomingMessage } from './incoming';
import { OutgoingMessage } from './outgoing';



@Injectable()
export class AssetRequestHandler implements RequestHandler<RequestPacket, ResponsePacket> {

    handle(endpoint: TransportEndpoint, session: TransportSession, logger: Logger, options: ServerOpts) {

        return session.receive().pipe(
            mergeMap(incoming => {
                if (!incoming.method) {
                    incoming.method = options.transportOpts?.microservice ? MESSAGE : GET;
                }
                const ctx = this.createContext(endpoint.injector, session, incoming, options);
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

    createContext(injector: Injector, session: TransportSession, incoming: IncomingPacket, options: ServerOpts): AssetContext {
        return new AssetContextImpl(injector, incoming.req ?? new IncomingMessage(session, incoming), incoming.res ?? new OutgoingMessage(session, incoming), options);
    }

}
