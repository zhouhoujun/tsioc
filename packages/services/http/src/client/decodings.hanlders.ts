import { DecodeHandler } from '@tsdi/common/transport';
import { Injectable } from '@tsdi/ioc';
import { IncomingMessage } from 'http';
import { Http2IncomingMessage } from './client.session';
import { ResponseIncomingResolver } from '@tsdi/common/client';


@Injectable({ static: true })
export class HttpResponseDecodingsHandlers {

    
    @DecodeHandler(IncomingMessage, { transport: 'http'})
    handleHttpMessage(message: IncomingMessage, resovler: ResponseIncomingResolver) {
        return resovler.resolve(message, context);
    }

    @DecodeHandler(Http2IncomingMessage, { transport: 'http'})
    handleHttp2Message(message: Http2IncomingMessage, resovler: ResponseIncomingResolver) {
        return resovler.resolve(message, context);
    }

}