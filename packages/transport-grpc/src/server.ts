import { Injectable } from '@tsdi/ioc';
import { Endpoint, EndpointBackend, TransportContextFactory, TransportServer } from '@tsdi/core';
import { HttpRequest, HttpResponse } from '@tsdi/transport';

@Injectable()
export class GrpcServer extends TransportServer<HttpRequest, HttpResponse>  {

    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    get contextFactory(): TransportContextFactory<HttpRequest, HttpResponse> {
        throw new Error('Method not implemented.');
    }
    getBackend(): EndpointBackend<HttpRequest, HttpResponse> {
        throw new Error('Method not implemented.');
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}