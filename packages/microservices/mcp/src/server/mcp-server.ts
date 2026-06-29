import { ContextToken, getTypeName, Inject, isNumber, isString, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    LOCALHOST, Events, createRequestContext, RequestContext,
    InternalServerException, ListenOpts, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import * as http from 'node:http';
import { McpServOptions, MCP_SERV_OPTIONS, MCP_BIND_INTERCEPTORS, MCP_BIND_FILTERS, MCP_BIND_GUARDS } from './options';

export const MCP_REQUEST = new ContextToken<http.IncomingMessage | null>(() => null);
export const MCP_RESPONSE = new ContextToken<http.ServerResponse | null>(() => null);
export const MCP_METHOD = new ContextToken<string | null>(() => null);
export const MCP_PARAMS = new ContextToken<any>(() => null);
export const MCP_ID = new ContextToken<any>(() => null);

/**
 * MCP (Model Context Protocol) server for microservices.
 * Implements JSON-RPC over HTTP following MCP specification.
 */
@Injectable()
export class McpServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    server?: http.Server | null;

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(MCP_SERV_OPTIONS, { nullable: true }) protected options: McpServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.server) throw new InternalServerException();
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                if (!this.options.listenOpts) this.options.listenOpts = { host: arg2, port };
                this.logger.info(getTypeName(this), 'MCP server listening:', `${arg2}:${port}`, '!');
                this.server.listen(port, arg2, listeningListener);
            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) this.options.listenOpts = { host: LOCALHOST, port };
                this.logger.info(getTypeName(this), 'MCP server listening on port', port, '!');
                this.server.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) this.options.listenOpts = opts;
            this.server.listen(opts, listeningListener ?? arg2);
        }
        return this;
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: MCP_BIND_INTERCEPTORS,
        filtersToken: MCP_BIND_FILTERS,
        guardsToken: MCP_BIND_GUARDS
    })
    async bind(_event: BindServiceEvent<any>) {
        if (this.server) return;
        await this.onStart();
    }

    async onStart(bindServer?: http.Server): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        if (!this.server) {
            this.server = bindServer || http.createServer();
        }

        this.server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
            if (req.method === 'POST') {
                this.handleJsonRpc(req, res);
            } else {
                res.writeHead(405);
                res.end();
            }
        });

        this.server.on(Events.ERROR, (err: Error) => this.logger.error(err));

        if (!this.options.microservice && !bindServer) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.server, Transport.MCP, this));
        }

        if (!bindServer) {
            if (!this.options.listenOpts) this.options.listenOpts = { host: LOCALHOST, port: 3100 };
            await new Promise<void>((resolve, reject) => {
                const cleanup = () => {
                    this.server?.off('listening', onListening);
                    this.server?.off('error', onError);
                };
                const onListening = () => {
                    cleanup();
                    resolve();
                };
                const onError = (err: Error) => {
                    cleanup();
                    reject(err);
                };
                this.server!.once('listening', onListening);
                this.server!.once('error', onError);
                this.listen(this.options.listenOpts!);
            });
        }
    }

    async onShutdown(): Promise<void> {
        if (!this.server) return;
        this.destroy$.next();
        this.destroy$.complete();
        const server = this.server;

        if (typeof (server as any).unref === 'function') {
            (server as any).unref();
        }
        try {
            await promisify(server.close, server)();
        } catch (err: any) {
            if (err?.code !== 'ERR_SERVER_NOT_RUNNING') {
                throw err;
            }
        }

        server.removeAllListeners();
        this.server = null;
    }

    private handleJsonRpc(req: http.IncomingMessage, res: http.ServerResponse) {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
            const body = Buffer.concat(chunks).toString();
            let jsonRpcRequest: any;
            try { jsonRpcRequest = JSON.parse(body); } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(mcpError(-32700, 'Parse error')));
                return;
            }

            if (!jsonRpcRequest.jsonrpc || !jsonRpcRequest.method) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(mcpError(-32600, 'Invalid Request')));
                return;
            }

            const method = jsonRpcRequest.params?.__method || 'POST';
            const params = jsonRpcRequest.params ? { ...jsonRpcRequest.params } : undefined;
            if (params) delete params.__method;
            const requestData = {
                ...jsonRpcRequest,
                url: '/' + jsonRpcRequest.method.replace(/\./g, '/'),
                method,
                body: params,
                headers: req.headers
            };

            const context = createRequestContext(this.injector, [
                [REQUEST, requestData],
                [MCP_REQUEST, req],
                [MCP_RESPONSE, res],
                [MCP_METHOD, jsonRpcRequest.method],
                [MCP_PARAMS, jsonRpcRequest.params],
                [MCP_ID, jsonRpcRequest.id],
            ]);

            this.handler.handle(requestData as TReq, context)
                .pipe(takeUntil(race(this.destroy$).pipe(take(1))))
                .subscribe({
                    error: (err: any) => this.logger.error(err),
                });
        });
    }
}

function mcpError(code: number, message: string) {
    return { jsonrpc: '2.0', error: { code, message }, id: null };
}
