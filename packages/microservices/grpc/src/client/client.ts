import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { defaultFormatter, Pattern, RequestInitOpts, UrlRequestOptions, ResponseEvent, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { defer, Observable } from 'rxjs';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { GRPC_CLIENT_OPTIONS, GrpcClientOptions } from './options';
import { GrpcRequest } from './request';

@Injectable()
export class GrpcClient extends AbstractClient<GrpcRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

    private connection?: grpc.Client;
    private serviceCtor?: grpc.ServiceClientConstructor;

    constructor(
        readonly handler: ClientHandler<GrpcRequest<any>, ResponseEvent<any>>,
        @Inject(GRPC_CLIENT_OPTIONS, { nullable: true }) private options: GrpcClientOptions
    ) { super(); }

    /**
     * Current gRPC service client (used by the transport backend).
     */
    getConnection(): grpc.Client | undefined {
        return this.connection;
    }

    protected connect(): Observable<grpc.Client> {
        return defer(async () => {
            if (this.connection) return this.connection;
            const url = this.options.url || 'localhost:50051';
            const creds = this.options.credentials || grpc.credentials.createInsecure();
            if (this.options.protoPath) {
                const ctor = this.loadServiceCtor();
                this.connection = new (ctor as any)(url, creds) as grpc.Client;
            } else {
                this.connection = new grpc.Client(url, creds);
            }
            return this.connection;
        });
    }

    private loadServiceCtor(): grpc.ServiceClientConstructor {
        if (this.serviceCtor) {
            return this.serviceCtor;
        }
        if (!this.options.protoPath) {
            throw new Error('gRPC client requires `protoPath` to build a service client');
        }
        const packageDefinition = protoLoader.loadSync(this.options.protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
        const loaded = grpc.loadPackageDefinition(packageDefinition) as any;
        const pkg = this.options.packageName
            ? this.options.packageName.split('.').reduce((acc, key) => acc?.[key], loaded)
            : loaded;
        if (!pkg) {
            throw new Error(`gRPC package '${this.options.packageName}' was not found in ${this.options.protoPath}`);
        }
        const serviceName = this.options.serviceName;
        const service = serviceName ? pkg[serviceName] : Object.values(pkg).find((value: any) => value?.service);
        if (!service) {
            throw new Error(`gRPC service '${serviceName ?? '(first)'}' was not found in ${this.options.protoPath}`);
        }
        this.serviceCtor = service as grpc.ServiceClientConstructor;
        return this.serviceCtor;
    }

    protected initContext(context: Context, req: GrpcRequest<any>): void {
        context.set(GrpcClient, this);
        context.set(GrpcRequest, req);
    }

    protected buildRequest(first: GrpcRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): GrpcRequest<any> {
        if (first instanceof GrpcRequest) return first;
        const defaultMethod = this.options.microservice ? undefined : 'INVOKE';
        if (isString(first)) return new GrpcRequest(first, null, options, defaultMethod);
        else {
            const formatter = this.handler.injector.get(PatternFormatter, defaultFormatter) ?? defaultFormatter;
            return new GrpcRequest(formatter.format(first), first, options, defaultMethod);
        }
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
