export interface AppRpcRequest {
    jsonrpc?: '2.0' | string;
    id?: string | number | null;
    method?: string;
    params?: any;
}

export interface AppRpcSuccessResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result: any;
}

export interface AppRpcErrorObject {
    code: number;
    message: string;
    data?: any;
}

export interface AppRpcErrorResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    error: AppRpcErrorObject;
}

export interface AppRpcNotification {
    jsonrpc: '2.0';
    method: string;
    params?: any;
}

export type AppRpcResponse = AppRpcSuccessResponse | AppRpcErrorResponse;
export type AppRpcTransportMessage = AppRpcResponse | AppRpcNotification;

export interface AppRpcRequestContext {
    principalId?: string;
}

export class AppRpcError extends Error {
    constructor(
        public code: number,
        message: string,
        public data?: any
    ) {
        super(message);
    }
}
