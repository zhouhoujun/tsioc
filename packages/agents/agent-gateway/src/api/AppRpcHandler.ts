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

        return [
            { method: 'POST', path: '/rpc', handler }
        ];
    }
}
