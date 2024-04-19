import { HttpRequest } from '@tsdi/common/http';
import { EncodeHandler } from '@tsdi/common/transport';
import { Injectable } from '@tsdi/ioc';


@Injectable({ static: true })
export class HttpRequestEncodingsHandlers {

    @EncodeHandler(HttpRequest, { transport: 'http' })
    handleRequest(req: HttpRequest) {
        return req.body;
    }
}
