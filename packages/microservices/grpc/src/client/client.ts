import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, UrlRequestOptions, ResponseEvent, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable, switchMap } from 'rxjs';
import * as grpc from '@grpc/grpc-js';
import { GRPC_CLIENT_OPTIONS, GrpcClientOptions } from './options';
import { GrpcRequest } from './request';

@Injectable()
export class GrpcClient extends AbstractClient<GrpcRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

    private connection?: grpc.Client;

    constructor(
        readonly handler: ClientHandler<GrpcRequest<any>, ResponseEvent<any>>,
        @Inject(GRPC_CLIENT_OPTIONS, { nullable: true }) private options: GrpcClientOptions
    ) { super(); }

    protected connect(): Observable<grpc.Client> {
        return defer(async () => {
            if (this.connection) return this.connection;
            const url = this.options.url || 'localhost:50051';
            const creds = this.options.credentials || grpc.credentials.createInsecure();
            this.connection = new grpc.Client(url, creds);
            return this.connection;
        });
    }

    protected initContext(context: Context, req: GrpcRequest<any>): void {
        context.set(GrpcClient, this);
        context.set(GrpcRequest, req);
    }

    protected buildRequest(first: GrpcRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): GrpcRequest<any> {
        if (first instanceof GrpcRequest) return first;
        const defaultMethod = this.options.microservice ? undefined : 'INVOKE';
        if (isString(first)) return new GrpcRequest(first, null, options, defaultMethod);
        else return new GrpcRequest(this.handler.injector.get(PatternFormatter).format(first), first, options, defaultMethod);
    }

    protected async onShutdown(): Promise<void> {
        if (this.connection) {
            this.connection.close();
            this.connection = undefined;
        }
    }

    protected isValid(connection: grpc.Client): boolean {
        const cs = connection.getChannel().getConnectivityState(false);
        return cs === grpc.connectivityState.READY || cs === grpc.connectivityState.IDLE;
    }
}
