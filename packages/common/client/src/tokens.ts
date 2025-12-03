import { getToken, Token } from '@tsdi/ioc';
import { Protocols, RequestInterceptor, RequestInterceptorFn, RequestInterceptorLike } from '@tsdi/common';
import { ClientOptions } from './client.options';



export function getClientInterceptorsToken(protocol: Protocols, name?: string): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptor[]>(`${protocol.toUpperCase()}_CLIENT_INTERCEPTORS`, name);
}

// export function getInterceptorFnsToken(protocol: Protocols, name?: string): Token<RequestInterceptorFn[]> {
//     return getToken<RequestInterceptorFn[]>(`${protocol.toUpperCase()}_INTERCEPTOR_FNS`, name);
// }


// export function getLegacyInterceptorToken(protocol: Protocols, name?: string): Token<RequestInterceptorFn> {
//     return getToken<RequestInterceptorFn>(`${protocol.toUpperCase()}_LEGACY_INTERCEPTOR_FN`, name);
// }


export function getClientTransfersToken(protocol: Protocols, name?: string): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptorLike[]>(`${protocol.toUpperCase()}_CLIENT_TRANSFERS`, name);
}



export function getClientOptionsToken(protocol: Protocols, name?: string): Token<ClientOptions> {
    return getToken<ClientOptions>(`${protocol.toUpperCase()}_CLIENT_OPTIONS`, name);
}

export function getClientHanlderToken(protocol: Protocols, name?: string): Token<ClientOptions> {
    return getToken<ClientOptions>(`${protocol.toUpperCase()}_CLIENT_HANDLER`, name);
}



export function getClientToken(protocol: Protocols, name?: string): Token<ClientOptions> {
    return getToken<ClientOptions>(`${protocol.toUpperCase()}_CLIENT`, name);
}
