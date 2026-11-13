import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { defaultFormatter, Pattern, RequestInitOpts, UrlRequestOptions, ResponseEvent, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { defer, mergeMap, Observable } from 'rxjs';
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

    /**
     * Invoke a bidirectional-streaming RPC. `values` are written in order and
     * response messages are emitted as they arrive.
     */
    bidiStream<T = any>(
        pattern: Pattern,
        values: any[],
        options: { headers?: Record<string, string>; timeout?: number } = {}
    ): Observable<T> {
        return defer(() => this.connect()).pipe(
            mergeMap((connection: any) => new Observable<T>(observer => {
                const method = resolveStreamMethod(pattern);
                const fn = connection?.[method];
                if (typeof fn !== 'function') {
                    observer.error(new Error(`gRPC bidi method '${method}' is not defined by the loaded proto`));
                    return;
                }
                const metadata = new grpc.Metadata();
                for (const [key, value] of Object.entries(options.headers ?? {})) {
                    if (value != null) {
                        metadata.set(key, String(value));
                    }
                }
                const timeout = Number(options.timeout ?? this.options.deadlineMs ?? 0);
                const callOptions = timeout > 0 ? { deadline: Date.now() + timeout } : undefined;
                const call = callOptions
                    ? fn.call(connection, metadata, callOptions)
                    : fn.call(connection, metadata);
                call.on('data', (value: T) => observer.next(value));
                call.on('error', (err: any) => observer.error(Object.assign(
                    new Error(err?.details ?? err?.message ?? 'gRPC bidi stream failed'),
                    { code: err?.code, statusCode: err?.code }
                )));
                call.on('end', () => observer.complete());
                for (const value of values ?? []) {
                    call.write(value);
                }
                call.end();
                return () => {
                    try {
                        call.cancel?.();
                    } catch {
                        // best effort
                    }
                };
            }))
        );
    }

    /**
     * Invoke a client-streaming RPC with an array of request messages.
     */
    clientStream<T = any>(
        pattern: Pattern,
        values: any[],
        options: { headers?: Record<string, string>; timeout?: number } = {}
    ): Observable<T> {
        return defer(() => this.connect()).pipe(
            mergeMap((connection: any) => new Observable<T>(observer => {
                const method = resolveStreamMethod(pattern);
                const fn = connection?.[method];
                if (typeof fn !== 'function') {
                    observer.error(new Error(`gRPC client-stream method '${method}' is not defined by the loaded proto`));
                    return;
                }
                const metadata = new grpc.Metadata();
                for (const [key, value] of Object.entries(options.headers ?? {})) {
                    if (value != null) {
                        metadata.set(key, String(value));
                    }
                }
                const timeout = Number(options.timeout ?? this.options.deadlineMs ?? 0);
                const callOptions = timeout > 0 ? { deadline: Date.now() + timeout } : undefined;
                const callback = (err: any, response: T) => {
                    if (err) {
                        observer.error(Object.assign(
                            new Error(err?.details ?? err?.message ?? 'gRPC client stream failed'),
                            { code: err?.code, statusCode: err?.code }
                        ));
                        return;
                    }
                    observer.next(response);
                    observer.complete();
                };
                const call = callOptions
                    ? fn.call(connection, metadata, callOptions, callback)
                    : fn.call(connection, metadata, callback);
                for (const value of values ?? []) {
                    call.write(value);
                }
                call.end();
                return () => {
                    try {
                        call.cancel?.();
                    } catch {
                        // best effort
                    }
                };
            }))
        );
    }

    /**
     * Invoke a server-streaming RPC. Each emitted value is delivered as it
     * arrives from the server.
     */
    serverStream<T = any>(
        pattern: Pattern,
        options: { body?: any; payload?: any; headers?: Record<string, string>; timeout?: number } = {}
    ): Observable<T> {
        return defer(() => this.connect()).pipe(
            mergeMap((connection: any) => new Observable<T>(observer => {
                const method = resolveStreamMethod(pattern);
                const fn = connection?.[method];
                if (typeof fn !== 'function') {
                    observer.error(new Error(`gRPC server-stream method '${method}' is not defined by the loaded proto`));
                    return;
                }
                const metadata = new grpc.Metadata();
                for (const [key, value] of Object.entries(options.headers ?? {})) {
                    if (value != null) {
                        metadata.set(key, String(value));
                    }
                }
                const payload = options.body ?? options.payload ?? {};
                const timeout = Number(options.timeout ?? this.options.deadlineMs ?? 0);
                const callOptions = timeout > 0 ? { deadline: Date.now() + timeout } : undefined;
                const call = callOptions
                    ? fn.call(connection, payload, metadata, callOptions)
                    : fn.call(connection, payload, metadata);
                call.on('data', (value: T) => observer.next(value));
                call.on('error', (err: any) => observer.error(Object.assign(
                    new Error(err?.details ?? err?.message ?? 'gRPC stream failed'),
                    { code: err?.code, statusCode: err?.code }
                )));
                call.on('end', () => observer.complete());
                return () => {
                    try {
                        call.cancel?.();
                    } catch {
                        // best effort
                    }
                };
            }))
        );
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

function resolveStreamMethod(pattern: Pattern): string {
    if (pattern && typeof pattern === 'object' && !(pattern instanceof RegExp) && typeof (pattern as any).method === 'string') {
        return (pattern as any).method;
    }
    const raw = String(pattern ?? '');
    const index = raw.lastIndexOf('/');
    return index >= 0 ? raw.slice(index + 1) : raw;
}
