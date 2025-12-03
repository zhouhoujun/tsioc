import { getToken, Token } from '@tsdi/ioc';
import { Protocols, RequestInterceptor, RequestInterceptorFn, RequestInterceptorLike } from '@tsdi/common';
import { ServiceConfig } from './server.options';
import { FilterLike } from '@tsdi/core';
import { Router } from './router/router';
import { AbstractRequestHandler } from './AbstractRequestHandler';


function toMicroName(name?: string, microservice?: boolean) {
    return microservice ? 'MICRO_' + (name ?? '') : name
}

export function getFiltersToken(protocol: Protocols, name?: string, microservice?: boolean): Token<FilterLike[]> {
    return getToken<FilterLike[]>(`${protocol.toUpperCase()}_FILTERS`, toMicroName(name, microservice));
}


export function getInterceptorsToken(protocol: Protocols, name?: string, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptor[]>(`${protocol.toUpperCase()}_INTERCEPTORS`, toMicroName(name, microservice));
}

// export function getInterceptorFnsToken(protocol: Protocols, name?: string): Token<RequestInterceptorFn[]> {
//     return getToken<RequestInterceptorFn[]>(`${protocol.toUpperCase()}_INTERCEPTOR_FNS`, name);
// }


// export function getLegacyInterceptorToken(protocol: Protocols, name?: string): Token<RequestInterceptorFn> {
//     return getToken<RequestInterceptorFn>(`${protocol.toUpperCase()}_LEGACY_INTERCEPTOR_FN`, name);
// }


export function getTransfersToken(protocol: Protocols, name?: string, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptorLike[]>(`${protocol.toUpperCase()}_TRANSFERS`, toMicroName(name, microservice));
}


export function getRouterToken(protocol: Protocols, name?: string, microservice?: boolean): Token<Router> {
    return getToken(Router, protocol + '_' + toMicroName(name, microservice))
}




export function getServiceOptionsToken(protocol: Protocols, name?: string, microservice?: boolean): Token<ServiceConfig> {
    return getToken<ServiceConfig>(`${protocol.toUpperCase()}_OPTIONS`, toMicroName(name, microservice));
}

export function getServiceHanlderToken(protocol: Protocols, name?: string, microservice?: boolean): Token<AbstractRequestHandler> {
    return getToken<AbstractRequestHandler>(`${protocol.toUpperCase()}_HANDLER`, toMicroName(name, microservice));
}


export function getServiceToken(protocol: Protocols, name?: string, microservice?: boolean): Token<ServiceConfig> {
    return getToken<ServiceConfig>(`${protocol.toUpperCase()}_SERVICE`, toMicroName(name, microservice));
}
