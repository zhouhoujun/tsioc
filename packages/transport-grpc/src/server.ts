import { Injectable } from '@tsdi/ioc';
import { Endpoint, TransportServer } from '@tsdi/core';
import { HttpRequest, WritableHttpResponse } from '@tsdi/transport';

@Injectable()
export class GrpcServer extends TransportServer<HttpRequest, WritableHttpResponse>  {

    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    getEndpoint(): Endpoint<HttpRequest<any>, WritableHttpResponse> {
        throw new Error('Method not implemented.');
    }

    get endpoint(): Endpoint<HttpRequest<any>, WritableHttpResponse> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}