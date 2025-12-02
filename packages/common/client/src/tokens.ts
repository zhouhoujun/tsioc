import { getToken, Token } from '@tsdi/ioc';
import { Protocols, RequestInterceptor, RequestInterceptorFn, RequestInterceptorLike } from '@tsdi/common';
import { ClientOptions } from './client.options';



export function getInterceptorsToken(protocol: Protocols, name?: string): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptor[]>(`${protocol.toUpperCase()}_INTERCEPTORS`, name);
}

export function getInterceptorFnsToken(protocol: Protocols, name?: string): Token<RequestInterceptorFn[]> {
    return getToken<RequestInterceptorFn[]>(`${protocol.toUpperCase()}_INTERCEPTOR_FNS`, name);
}


export function getLegacyInterceptorToken(protocol: Protocols, name?: string): Token<RequestInterceptorFn> {
    return getToken<RequestInterceptorFn>(`${protocol.toUpperCase()}_LEGACY_INTERCEPTOR_FN`, name);
}


export function getClientOptionsToken(protocol: Protocols, name?: string): Token<ClientOptions> {
    return getToken<ClientOptions>(`${protocol.toUpperCase()}_OPTIONS`, name);
}

export function getClientHanlderToken(protocol: Protocols, name?: string): Token<ClientOptions> {
    return getToken<ClientOptions>(`${protocol.toUpperCase()}_HANDLER`, name);
}



export function getClientToken(protocol: Protocols, name?: string): Token<ClientOptions> {
    return getToken<ClientOptions>(`${protocol.toUpperCase()}_CLIENT`, name);
}
