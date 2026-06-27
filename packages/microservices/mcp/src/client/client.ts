import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, UrlRequestOptions, ResponseEvent, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { defer, Observable, switchMap, map, catchError, of, throwError } from 'rxjs';
import * as http from 'node:http';
import { MCP_CLIENT_OPTIONS, McpClientOptions } from './options';
import { McpRequest } from './request';

@Injectable()
export class McpClient extends AbstractClient<McpRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

    constructor(
        readonly handler: ClientHandler<McpRequest<any>, ResponseEvent<any>>,
        @Inject(MCP_CLIENT_OPTIONS, { nullable: true }) private options: McpClientOptions
    ) { super(); }

    protected connect(): Observable<any> {
        return defer(async () => ({ connected: true }));
    }

    protected initContext(context: Context, req: McpRequest<any>): void {
        context.set(McpClient, this);
        context.set(McpRequest, req);
    }

    protected buildRequest(first: McpRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): McpRequest<any> {
        if (first instanceof McpRequest) return first;
        const defaultMethod = this.options.microservice ? undefined : 'CALL';
        if (isString(first)) return new McpRequest(first, null, options, defaultMethod);
        else return new McpRequest(this.handler.injector.get(PatternFormatter).format(first), first, options, defaultMethod);
    }

    protected override request(first: Pattern | McpRequest<any>, options: UrlRequestOptions = {} as any): Observable<any> {
        const req = this.buildRequest(first, options);
        const url = this.options.url || 'http://127.0.0.1:3100';
        const parsedUrl = new URL(url);
        const method = req.method || 'CALL';
        const path = req.url || (typeof first === 'string' ? first : '/');
        const jsonRpcMethod = path.startsWith('/') ? path.substring(1).replace(/\//g, '.') : path.replace(/\//g, '.');
        const id = Date.now();

        const body = req.body ?? req.payload ?? options.body;
        const jsonRpcBody = JSON.stringify({
            jsonrpc: '2.0',
            method: jsonRpcMethod,
            params: body ? { ...body, __method: method } : { __method: method },
            id
        });

        return new Observable<any>(observer => {
            const httpReq = http.request({
                hostname: parsedUrl.hostname,
                port: parsedUrl.port ? parseInt(parsedUrl.port) : 3100,
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

                            if ((options as any).observe === 'response') {
                                observer.next(errResponse);
                                observer.complete();
                            } else {
                                observer.error(errResponse);
                            }
                            return;
                        }
                        const result = jsonRpcResponse.result;
                        if ((options as any).observe === 'response') {
                            observer.next({ ok: true, body: result, status: 200, statusCode: 200 });
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
        });
    }

    protected async onShutdown(): Promise<void> {}
    protected isValid(_connection: any): boolean { return true; }
}
