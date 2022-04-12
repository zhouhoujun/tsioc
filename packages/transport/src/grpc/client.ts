import { Injectable } from '@tsdi/ioc';
import { Endpoint, RequestBase, ResponseBase, TransportClient } from '@tsdi/core';


@Injectable()
export class GrpcClient extends TransportClient<RequestBase, ResponseBase> {
    get endpoint(): Endpoint<RequestBase<any>, ResponseBase<any>> {
        throw new Error('Method not implemented.');
    }
    connect(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected buildRequest(req: string | RequestBase<any>, options?: any): RequestBase<any> | Promise<RequestBase<any>> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
