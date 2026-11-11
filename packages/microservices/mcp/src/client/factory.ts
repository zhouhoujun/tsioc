import { asProvider } from '@tsdi/ioc';
import { TransferSide, Transport } from '@tsdi/common';
import { useJsonPacket } from '@tsdi/transport';
import { createClientTransportFeature, getClientBackendToken, ClientTransportFeature } from '@tsdi/client';
import { MCP_CLIENT_OPTIONS, McpClientOptions } from './options';
import { McpClient } from './client';
import { Observable } from 'rxjs';
import * as http from 'node:http';

export function mcpClientTransportFactory(option: Partial<McpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.MCP, side: TransferSide.client,
        ...option, features: { defaultTransfer: useJsonPacket(), ...option.features },
    } as McpClientOptions;
    const backendToken = getClientBackendToken(config);
    return createClientTransportFeature({
        config,
        asDefault,
        optionToken: MCP_CLIENT_OPTIONS,
        clientType: McpClient,
        backendProvider: asProvider({
            provide: backendToken,
            useFactory: () => createMcpClientBackend(config),
            multi: true
        })
    });
}

export function withMcpTransport(...options: Partial<McpClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => mcpClientTransportFactory(o, o.asDefault ?? (i === 0)));
}

function createMcpClientBackend(config: McpClientOptions) {
    return (req: any, _context: any) => new Observable<any>(observer => {
        const url = config.url || 'http://127.0.0.1:3100';
        const parsedUrl = new URL(url);
        const method = req.method || 'CALL';
        const path = req.url || '/';
        const jsonRpcMethod = path.startsWith('/') ? path.substring(1).replace(/\//g, '.') : path.replace(/\//g, '.');
        const id = Date.now();
        const body = req.body ?? req.payload;
        const jsonRpcBody = JSON.stringify({
            jsonrpc: '2.0',
            method: jsonRpcMethod,
            params: body ? { ...body, __method: method } : { __method: method },
            id
        });

        const httpReq = http.request({
            hostname: parsedUrl.hostname,
            port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 3100,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonRpcBody),
                ...((req.headers || {}) as any)
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonRpcResponse = JSON.parse(data);
                    if (jsonRpcResponse.error) {
                        const errResponse = {
                            ok: false,
                            status: jsonRpcResponse.error.code || 500,
                            statusCode: jsonRpcResponse.error.code || 500,
                            statusMessage: jsonRpcResponse.error.message || 'Error',
                            message: jsonRpcResponse.error.message || 'Error',
                            body: jsonRpcResponse.error.data,
                            error: jsonRpcResponse.error
                        };

                        if (req.observe === 'response') {
                            observer.next(errResponse);
                            observer.complete();
                        } else {
                            observer.error(errResponse);
                        }
                        return;
                    }
                    const result = jsonRpcResponse.result;
                    if (req.observe === 'response') {
                        observer.next({
                            ok: true,
                            status: 200,
                            statusCode: 200,
                            statusMessage: 'OK',
                            body: result,
                            payload: result
                        });
                    } else {
                        observer.next(result);
                    }
                    observer.complete();
                } catch (e: any) {
                    observer.error(new Error('Invalid JSON-RPC response: ' + e.message));
                }
            });
        });
        httpReq.on('error', (err) => observer.error(err));
        httpReq.write(jsonRpcBody);
        httpReq.end();
        return () => httpReq.destroy();
    });
}
