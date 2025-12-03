import { getToken, Token } from '@tsdi/ioc';
import { Protocols, RequestInterceptor, RequestInterceptorLike } from '@tsdi/common';
import { ClientOptions } from './client.options';


function toMicroName(name?: string, microservice?: boolean) {
    return microservice ? 'MICRO_' + (name ?? '') : name
}

export function getClientInterceptorsToken(protocol: Protocols, name?: string, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptor[]>(`${protocol.toUpperCase()}_CLIENT_INTERCEPTORS`, toMicroName(name, microservice));
}

// export function getInterceptorFnsToken(protocol: Protocols, name?: string): Token<RequestInterceptorFn[]> {
//     return getToken<RequestInterceptorFn[]>(`${protocol.toUpperCase()}_INTERCEPTOR_FNS`, name);
// }


// export function getLegacyInterceptorToken(protocol: Protocols, name?: string): Token<RequestInterceptorFn> {
//     return getToken<RequestInterceptorFn>(`${protocol.toUpperCase()}_LEGACY_INTERCEPTOR_FN`, name);
// }


export function getClientTransfersToken(protocol: Protocols, name?: string, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptorLike[]>(`${protocol.toUpperCase()}_CLIENT_TRANSFERS`, toMicroName(name, microservice));
}



export function getClientOptionsToken(protocol: Protocols, name?: string, microservice?: boolean): Token<ClientOptions> {
    return getToken<ClientOptions>(`${protocol.toUpperCase()}_CLIENT_OPTIONS`, toMicroName(name, microservice));
}

export function getClientHanlderToken(protocol: Protocols, name?: string, microservice?: boolean): Token<ClientOptions> {
    return getToken<ClientOptions>(`${protocol.toUpperCase()}_CLIENT_HANDLER`, toMicroName(name, microservice));
}



export function getClientToken(protocol: Protocols, name?: string, microservice?: boolean): Token<ClientOptions> {
    return getToken<ClientOptions>(`${protocol.toUpperCase()}_CLIENT`, toMicroName(name, microservice));
}
