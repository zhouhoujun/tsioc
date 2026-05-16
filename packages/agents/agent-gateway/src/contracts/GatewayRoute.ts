import * as http from 'http';

export interface GatewayRequestState {
    principalId?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type RouteHandler = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    params: Record<string, string>,
    body?: any,
    state?: GatewayRequestState
) => Promise<void> | void;

export interface GatewayRoute {
    method: HttpMethod;
    /** Path pattern, e.g. /api/sessions/:id . Supports :param and * wildcard */
    path: string;
    handler: RouteHandler;
    /** If true, requires auth */
    auth?: boolean;
}
