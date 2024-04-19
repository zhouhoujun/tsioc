import { DecodeHandler } from '@tsdi/common/transport';
import { Injectable } from '@tsdi/ioc';
import { HttpIncomings } from './http.session';


@Injectable({ static: true })
export class HttpIncomingDecodingsHandlers {

    @DecodeHandler(HttpIncomings, {transport: 'http'})
    handleIncoming() {

    }

}
