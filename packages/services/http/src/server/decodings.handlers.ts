import { CodingsContext, DecodeHandler } from '@tsdi/common/transport';
import { Injectable } from '@tsdi/ioc';
import { HttpIncomings, HttpServerTransportSession } from './http.session';
import { HttpAssetContextFactory } from './context';


@Injectable({ static: true })
export class HttpIncomingDecodingsHandlers {

    @DecodeHandler(HttpIncomings, {transport: 'http'})
    handleIncoming(incoming: HttpIncomings, context: CodingsContext) {
        const session = context.session as HttpServerTransportSession;
        const injector = session.injector;
        return injector.get(HttpAssetContextFactory).create(injector, session, incoming.req, incoming.res, session.serverOpts)
    }

}
