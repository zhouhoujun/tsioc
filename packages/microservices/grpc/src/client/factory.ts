import { asProvider } from '@tsdi/ioc';
import { RequestContext, TransferSide, Transport } from '@tsdi/common';
import { createClientTransportFeature, getClientBackendToken, ClientTransportFeature } from '@tsdi/client';
import { Observable } from 'rxjs';
import * as grpc from '@grpc/grpc-js';
import { GRPC_CLIENT_OPTIONS, GrpcClientOptions } from './options';
import { GrpcClient } from './client';

function resolveMethod(req: any): string {
    const pattern = req?.pattern;
    if (pattern && typeof pattern === 'object' && typeof pattern.method === 'string') {
        return pattern.method;
    }
    const raw = String(req?.url ?? '');
    const index = raw.lastIndexOf('/');
    return index >= 0 ? raw.slice(index + 1) : String(req?.method ?? '');
}

function createGrpcBackend(_config: GrpcClientOptions) {
    return (req: any, context: RequestContext) => new Observable<any>(observer => {
        const client = context.get(GrpcClient) as GrpcClient | undefined;
        const connection = client?.getConnection();
        if (!connection) {
            observer.error(new Error('gRPC connection is not ready'));
            return;
        }
        const method = resolveMethod(req);
        const fn = (connection as any)[method];
        if (typeof fn !== 'function') {
            observer.error(new Error(`gRPC method '${method}' is not defined by the loaded proto`));
            return;
        }
        const metadata = new grpc.Metadata();
        const headers = req?.headers?.getHeaders?.() ?? req?.headers ?? {};
        for (const [key, value] of Object.entries(headers)) {
            if (value != null && !key.startsWith(':')) {
                if (Array.isArray(value)) {
                    value.forEach(item => metadata.add(key, String(item)));
                } else {
                    metadata.set(key, String(value));
                }
            }
        }
        const payload = req?.body ?? req?.payload ?? {};
        const timeout = Number(req?.timeout ?? req?.deadline ?? _config.deadlineMs ?? 0);
        const callOptions = timeout > 0 ? { deadline: Date.now() + timeout } : undefined;
        const callback = (err: any, response: any) => {
            if (err) {
                const error = Object.assign(new Error(err.details ?? err.message ?? 'gRPC call failed'), {
                    code: err.code,
                    statusCode: err.code
                });
                observer.error(error);
                return;
            }
            observer.next(req?.observe === 'response'
                ? { status: 0, statusCode: 0, ok: true, body: response, payload: response, headers: {} }
                : response);
            observer.complete();
        };
        const call = callOptions
            ? fn.call(connection, payload, metadata, callOptions, callback)
            : fn.call(connection, payload, metadata, callback);
        return () => {
            try {
                call?.cancel?.();
            } catch {
                // best effort
            }
        };
    });
}

export function grpcClientTransportFactory(option: Partial<GrpcClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.gRPC, side: TransferSide.client,
        ...option, features: { ...option.features },
    } as GrpcClientOptions;
    const backendToken = getClientBackendToken(config);
    return createClientTransportFeature({
        config,
        asDefault,
        optionToken: GRPC_CLIENT_OPTIONS,
        clientType: GrpcClient,
        backendProvider: asProvider({ provide: backendToken, useFactory: () => createGrpcBackend(config), multi: true })
    });
}

export function withGrpcTransport(...options: Partial<GrpcClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => grpcClientTransportFactory(o, o.asDefault ?? (i === 0)));
}
