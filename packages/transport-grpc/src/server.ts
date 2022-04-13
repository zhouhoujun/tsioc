import { Injectable } from '@tsdi/ioc';
import { Endpoint, RequestBase, TransportServer, WritableResponse } from '@tsdi/core';

@Injectable()
export class GrpcServer extends TransportServer<RequestBase, WritableResponse>  {
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    get endpoint(): Endpoint<RequestBase<any>, WritableResponse<any>> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}