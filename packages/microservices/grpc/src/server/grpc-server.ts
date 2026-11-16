import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { createRequestContext, RequestContext, Transport } from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { lastValueFrom, Subject } from 'rxjs';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { GrpcServOptions, GRPC_SERV_OPTIONS, GRPC_BIND_INTERCEPTORS, GRPC_BIND_FILTERS, GRPC_BIND_GUARDS } from './options';

interface StreamWriterCall {
    write(value: any): boolean;
    on(event: 'drain', callback: () => void): any;
    end(): void;
}

function createStreamWriter(call: StreamWriterCall) {
    const pending: any[] = [];
    let draining = false;
    let ended = false;
    let closed = false;

    const flush = () => {
        if (closed) {
            return;
        }
        while (pending.length) {
            const value = pending.shift();
            if (!call.write(value)) {
                draining = true;
                return;
            }
        }
        draining = false;
        if (ended) {
            closed = true;
            call.end();
        }
    };

    call.on('drain', () => {
        draining = false;
        flush();
    });

    return {
        write(value: any) {
            if (closed || ended) {
                return;
            }
            if (draining) {
                pending.push(value);
                return;
            }
            if (!call.write(value)) {
                draining = true;
            }
        },
        end() {
            if (closed) {
                return;
            }
            ended = true;
            if (!draining) {
                closed = true;
                call.end();
            }
        },
        abort() {
            closed = true;
            ended = true;
            pending.length = 0;
        }
    };
}

@Injectable()
export class GrpcServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    server?: grpc.Server | null;
    /** Actual bound port (useful when `port: 0`). */
    boundPort?: number;

    @InjectLog() logger!: Logger;
    private destroy$: Subject<void>;
    private serviceName = '';

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(GRPC_SERV_OPTIONS, { nullable: true }) protected options: GrpcServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: GRPC_BIND_INTERCEPTORS,
        filtersToken: GRPC_BIND_FILTERS,
        guardsToken: GRPC_BIND_GUARDS
    })
    async bind(_event: BindServiceEvent<any>) {
        if (this.server) return;
        await this.onStart();
    }

    async onStart(): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        this.server = new grpc.Server();
        if (this.options.protoPath) {
            const service = this.loadService();
            const handlers: grpc.UntypedServiceImplementation = {};
            for (const methodName of Object.keys(service.service)) {
                const definition = service.service[methodName];
                if (definition.requestStream && definition.responseStream) {
                    handlers[methodName] = (call: grpc.ServerDuplexStream<any, any>) =>
                        this.handleBidiStream(service.serviceName, methodName, call);
                } else if (definition.requestStream) {
                    handlers[methodName] = (call: grpc.ServerReadableStream<any, any>, callback: grpc.sendUnaryData<any>) =>
                        this.handleClientStream(service.serviceName, methodName, call, callback);
                } else if (definition.responseStream) {
                    handlers[methodName] = (call: grpc.ServerWritableStream<any, any>) =>
                        this.handleServerStream(service.serviceName, methodName, call);
                } else {
                    handlers[methodName] = (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) =>
                        this.handleCall(service.serviceName, methodName, call, callback);
                }
            }
            this.server.addService(service.service, handlers);
        } else {
            this.logger.warn?.('gRPC server started without protoPath; no service handlers are registered');
        }

        const port = this.options.port ?? 50051;
        const host = this.options.host ?? '0.0.0.0';
        const creds = this.options.credentials || grpc.ServerCredentials.createInsecure();

        await new Promise<void>((resolve, reject) => {
            this.server!.bindAsync(`${host}:${port}`, creds, (err: Error | null, boundPort: number) => {
                if (err) {
                    this.logger.error('gRPC server bind error:', err);
                    reject(err);
                    return;
                }
                this.boundPort = boundPort;
                this.server?.start();
                this.logger.info(getTypeName(this), `gRPC server started on port ${boundPort}`);
                resolve();
            });
        });

        if (!this.options.microservice) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.server, Transport.gRPC, this));
        }
    }

    async onShutdown(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.server) {
            await new Promise<void>(resolve => this.server!.tryShutdown(() => resolve()));
            this.server = null;
        }
    }

    private loadService(): { service: grpc.ServiceDefinition; serviceName: string } {
        const protoPath = this.options.protoPath;
        if (!protoPath) {
            throw new Error('gRPC server requires `protoPath` to register service handlers');
        }
        const packageDefinition = protoLoader.loadSync(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
        const loaded = grpc.loadPackageDefinition(packageDefinition) as any;
        const serviceName = this.options.serviceName;
        const pkg = this.options.packageName
            ? this.options.packageName.split('.').reduce((acc, key) => acc?.[key], loaded)
            : loaded;
        if (!pkg) {
            throw new Error(`gRPC package '${this.options.packageName}' was not found in ${protoPath}`);
        }
        if (serviceName) {
            const service = pkg[serviceName];
            if (!service?.service) {
                throw new Error(`gRPC service '${serviceName}' was not found in package '${this.options.packageName ?? ''}'`);
            }
            this.serviceName = serviceName;
            return { service: service.service, serviceName };
        }
        const found = Object.keys(pkg)
            .map(key => ({ key, value: pkg[key] }))
            .find(item => item.value?.service);
        if (!found) {
            throw new Error(`No gRPC service found in ${protoPath}`);
        }
        this.serviceName = found.key;
        return { service: found.value.service, serviceName: found.key };
    }

    private handleBidiStream(
        serviceName: string,
        methodName: string,
        call: grpc.ServerDuplexStream<any, any>
    ): void {
        const queue: any[] = [];
        let ended = false;
        let wake: (() => void) | undefined;
        const notify = () => {
            const current = wake;
            wake = undefined;
            current?.();
        };
        call.on('data', (chunk: any) => {
            queue.push(chunk);
            notify();
        });
        call.on('end', () => {
            ended = true;
            notify();
        });
        call.on('error', () => undefined);

        const stream = {
            async *[Symbol.asyncIterator]() {
                while (true) {
                    if (queue.length) {
                        yield queue.shift();
                        continue;
                    }
                    if (ended) {
                        return;
                    }
                    await new Promise<void>(resolve => { wake = resolve; });
                }
            }
        };
        const request = {
            pattern: `/${this.options.packageName ? `${this.options.packageName}.` : ''}${serviceName}/${methodName}`,
            service: serviceName,
            method: methodName,
            url: `/${this.options.packageName ? `${this.options.packageName}.` : ''}${serviceName}/${methodName}`,
            headers: metadataToObject(call.metadata),
            body: { stream },
            payload: { stream }
        };
        const context = createRequestContext(this.injector);
        context.setPayload(request);
        let cleaned = false;
        const cleanup = () => {
            if (!cleaned) {
                cleaned = true;
                context.onDestroy();
            }
        };
        const writer = createStreamWriter(call as any);
        const subscription = (this.handler.handle(request as any, context) as any).subscribe({
            next: (value: any) => {
                writer.write(value ?? {});
            },
            error: (error: any) => {
                writer.abort();
                cleanup();
                try {
                    call.destroy({ code: mapGrpcStatus(error), message: error?.message ?? 'gRPC handler failed' } as any);
                } catch {
                    // best effort
                }
            },
            complete: () => {
                writer.end();
                cleanup();
            }
        });
        call.on('cancelled', () => {
            writer.abort();
            subscription?.unsubscribe?.();
            cleanup();
        });
    }

    private handleClientStream(
        serviceName: string,
        methodName: string,
        call: grpc.ServerReadableStream<any, any>,
        callback: grpc.sendUnaryData<any>
    ): void {
        const chunks: any[] = [];
        let cancelled = false;
        call.on('data', (chunk: any) => chunks.push(chunk));
        call.on('error', () => undefined);
        call.on('cancelled', () => { cancelled = true; });
        call.on('end', async () => {
            // grpc-js may emit `end` before `cancelled` when the client aborts
            // a stream; give the cancellation event one tick to arrive.
            await new Promise(resolve => setTimeout(resolve, 0));
            if (cancelled || (call as any).cancelled === true) {
                return;
            }
            const payload = chunks.length === 1 ? chunks[0] : chunks;
            const request = {
                pattern: `/${this.options.packageName ? `${this.options.packageName}.` : ''}${serviceName}/${methodName}`,
                service: serviceName,
                method: methodName,
                url: `/${this.options.packageName ? `${this.options.packageName}.` : ''}${serviceName}/${methodName}`,
                headers: metadataToObject(call.metadata),
                body: payload,
                payload
            };
            const context = createRequestContext(this.injector);
            context.setPayload(request);
            try {
                const result = await lastValueFrom(this.handler.handle(request as any, context) as any);
                callback(null, result ?? {});
            } catch (error: any) {
                this.logger?.error?.('gRPC handler error', error?.stack ?? error);
                callback({
                    code: mapGrpcStatus(error),
                    message: error?.message ?? 'gRPC handler failed'
                } as any);
            } finally {
                context.onDestroy();
            }
        });
    }

    private handleServerStream(
        serviceName: string,
        methodName: string,
        call: grpc.ServerWritableStream<any, any>
    ): void {
        const request = {
            pattern: `/${this.options.packageName ? `${this.options.packageName}.` : ''}${serviceName}/${methodName}`,
            service: serviceName,
            method: methodName,
            url: `/${this.options.packageName ? `${this.options.packageName}.` : ''}${serviceName}/${methodName}`,
            headers: metadataToObject(call.metadata),
            body: call.request,
            payload: call.request
        };
        const context = createRequestContext(this.injector);
        context.setPayload(request);
        let cleaned = false;
        const cleanup = () => {
            if (!cleaned) {
                cleaned = true;
                context.onDestroy();
            }
        };
        const writer = createStreamWriter(call as any);
        const subscription = (this.handler.handle(request as any, context) as any).subscribe({
            next: (value: any) => {
                writer.write(value ?? {});
            },
            error: (error: any) => {
                writer.abort();
                cleanup();
                try {
                    call.destroy({
                        code: mapGrpcStatus(error),
                        message: error?.message ?? 'gRPC handler failed'
                    } as any);
                } catch {
                    // best effort
                }
            },
            complete: () => {
                writer.end();
                cleanup();
            }
        });
        call.on('cancelled', () => {
            writer.abort();
            subscription?.unsubscribe?.();
            cleanup();
        });
    }

    private async handleCall(
        serviceName: string,
        methodName: string,
        call: grpc.ServerUnaryCall<any, any>,
        callback: grpc.sendUnaryData<any>
    ): Promise<void> {
        const request = {
            pattern: `/${this.options.packageName ? `${this.options.packageName}.` : ''}${serviceName}/${methodName}`,
            service: serviceName,
            method: methodName,
            url: `/${this.options.packageName ? `${this.options.packageName}.` : ''}${serviceName}/${methodName}`,
            headers: metadataToObject(call.metadata),
            body: call.request,
            payload: call.request
        };
        const context = createRequestContext(this.injector);
        context.setPayload(request);
        try {
            const result = await lastValueFrom(this.handler.handle(request as any, context) as any);
            callback(null, result ?? {});
        } catch (error: any) {
            this.logger?.error?.('gRPC handler error', error?.stack ?? error);
            callback({
                code: mapGrpcStatus(error),
                message: error?.message ?? 'gRPC handler failed',
                metadata: call.metadata
            } as any);
        } finally {
            context.onDestroy();
        }
    }
}

function metadataToObject(metadata: grpc.Metadata): Record<string, string> {
    const result: Record<string, string> = {};
    const map = metadata.getMap();
    for (const [key, value] of Object.entries(map)) {
        result[key] = String(value);
    }
    return result;
}

function mapGrpcStatus(error: any): number {
    const status = error?.statusCode ?? error?.status;
    switch (status) {
        case 400: return grpc.status.INVALID_ARGUMENT;
        case 401: return grpc.status.UNAUTHENTICATED;
        case 403: return grpc.status.PERMISSION_DENIED;
        case 404: return grpc.status.NOT_FOUND;
        case 409: return grpc.status.ABORTED;
        case 429: return grpc.status.RESOURCE_EXHAUSTED;
        case 503: return grpc.status.UNAVAILABLE;
        case 504: return grpc.status.DEADLINE_EXCEEDED;
        default: return grpc.status.INTERNAL;
    }
}
