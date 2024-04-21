import { EncodeHandler, Packet } from '@tsdi/common/transport';
import { Injectable } from '@tsdi/ioc';
import { HttpContext } from './context';

@Injectable({ static: true })
export class HttpOutgoingEncodingsHandlers {

    @EncodeHandler(HttpContext)
    handleContext(input: HttpContext) {
        const response = input.response;
        const packet = {
            id: response.id,
            type: response.type,
            status: response.statusCode,
            statusMessage: response.statusMessage,
            headers: response.headers
        } as Packet;
        if (response.error) {
            packet.error = response.error;
        }
        if (response.tHeaders.hasContentLength()) {
            packet.payload = input.body;
        }
        return packet;
    }

}
