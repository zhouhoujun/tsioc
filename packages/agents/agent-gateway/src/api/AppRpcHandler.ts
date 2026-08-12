import { Injectable } from '@tsdi/ioc';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { AppRpcServer } from '../app-rpc/AppRpcServer';
import { AppRpcError } from '../contracts/AppRpc';

@Injectable()
export class AppRpcHandler {
    constructor(
        private rpc: AppRpcServer
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const handler: RouteHandler = async (_req, res, _params, body, state) => {
            let response;
            try {
                response = await this.rpc.handlePayload(body, {
                    principalId: state?.principalId
                });
            } catch (error: any) {
                const rpcError = error instanceof AppRpcError
                    ? error
                    : new AppRpcError(-32603, error?.message ?? 'Internal error');
                response = {
                    jsonrpc: '2.0' as const,
                    id: body?.id ?? null,
                    error: {
                        code: rpcError.code,
                        message: rpcError.message,
                        data: rpcError.data
                    }
                };
            }
            if (!response) {
                res.writeHead(204).end();
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify(response));
        };

        /**
         * Streaming RPC route — `POST /rpc/stream`.
         * Yields `AppRpcTransportMessage[]` from `AppRpcServer.streamPayload`
         * as NDJSON (one JSON object per line), so clients can consume
         * `run.turn_stream` chunk notifications and the final result over HTTP.
         * Non-streaming methods fall back to a single result message.
         */
        const streamHandler: RouteHandler = async (_req, res, _params, body, state) => {
            res.writeHead(200, {
                'Content-Type': 'application/x-ndjson; charset=utf-8',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            });
            try {
                for await (const message of this.rpc.streamPayload(body ?? {}, {
                    principalId: state?.principalId
                })) {
                    res.write(`${JSON.stringify(message)}\n`);
                }
            } catch (error: any) {
                const rpcError = error instanceof AppRpcError
                    ? error
                    : new AppRpcError(-32603, error?.message ?? 'Internal error');
                res.write(`${JSON.stringify({
                    jsonrpc: '2.0',
                    id: body?.id ?? null,
                    error: {
                        code: rpcError.code,
                        message: rpcError.message,
                        data: rpcError.data
                    }
                })}\n`);
            }
            res.end();
        };

        return [
            { method: 'POST', path: '/rpc', handler },
            { method: 'POST', path: '/rpc/stream', handler: streamHandler }
        ];
    }
}
