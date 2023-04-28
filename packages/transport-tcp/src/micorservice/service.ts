import { EndpointContext, MicroService } from '@tsdi/core';
import { TcpMicroServiceEndpoint } from './endpoint';
import { Injectable } from '@tsdi/ioc';


@Injectable()
export class TcpMicroService extends MicroService<EndpointContext> {

    constructor(readonly endpoint: TcpMicroServiceEndpoint) {
        super()
    }

}
