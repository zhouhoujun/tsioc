import { Injectable } from '@tsdi/ioc';
import { Endpoint, TransportServer } from '@tsdi/core';
import { HttpRequest, HttpServerResponse } from '@tsdi/transport';

@Injectable()
export class GrpcServer extends TransportServer<HttpRequest, HttpServerResponse>  {

    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    getEndpoint(): Endpoint<HttpRequest<any>, HttpServerResponse> {
        throw new Error('Method not implemented.');
    }

    get endpoint(): Endpoint<HttpRequest<any>, HttpServerResponse> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}