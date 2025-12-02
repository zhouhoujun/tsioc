import { getToken, Token } from '@tsdi/ioc';
import { Protocols, RequestInterceptor, RequestInterceptorFn } from '@tsdi/common';



export function getInterceptorsToken(protocol: Protocols): Token<RequestInterceptor[]> {
    return getToken<RequestInterceptor[]>(`${protocol.toLowerCase()}_INTERCEPTORS`);
}

export function getInterceptorFnsToken(protocol: Protocols): Token<RequestInterceptorFn[]> {
    return getToken<RequestInterceptorFn[]>(`${protocol.toLowerCase()}_INTERCEPTOR_FNS`);
}


export function getLegacyInterceptorToken(protocol: Protocols): Token<RequestInterceptorFn> {
    return getToken<RequestInterceptorFn>(`${protocol.toLowerCase()}_LEGACY_INTERCEPTOR_FN`);
}
