import { Abstract, Injectable, InvocationContext, Token } from '@tsdi/ioc';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { Subscription } from 'rxjs';
import { ServerCredentials, Server, ChannelOptions } from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';
import { TransportClient, TransportClientOpts } from '@tsdi/transport';
import { RequestOptions } from '@tsdi/core';
import { Duplex } from 'form-data';


@Abstract()
export abstract class GrpcServOptions extends TransportClientOpts {
    channelOptions?: ChannelOptions;
}

@Injectable()
export class GrpcServer extends TransportClient<RequestOptions, GrpcServOptions>  {

    protected createDuplex(opts: GrpcServOptions): Duplex {
        throw new Error('Method not implemented.');
    }

}