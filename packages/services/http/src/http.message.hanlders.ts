import { DecodeHandler } from '@tsdi/common/transport';
import { Injectable } from '@tsdi/ioc';
import { IncomingMessage } from 'http';
import { Http2IncomingMessage } from './client/client.session';


@Injectable({ static: true })
export class HttpClientMessageHandlers {

    
    @DecodeHandler(IncomingMessage, { transport: 'http'})
    handleHttpMessage(message: IncomingMessage) {

    }

    @DecodeHandler(Http2IncomingMessage, { transport: 'http'})
    handleHttp2Message(message: Http2IncomingMessage) {
        
    }

}