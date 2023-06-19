import { Abstract } from '@tsdi/ioc';
import { Outgoing, TransportEndpoint } from '@tsdi/core';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { GrpcContext } from './context';

@Abstract()
export abstract class GrpcEndpoint extends TransportEndpoint<GrpcContext, Http2ServerResponse> {
    
}
