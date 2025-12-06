import { getToken, Invocation, Token } from '@tsdi/ioc';
import { Transport, RequestInterceptor, RequestInterceptorLike } from '@tsdi/common';
import { ServiceConfig } from './server.options';
import { FilterLike } from '@tsdi/core';
import { Router } from './router/router';
import { ServiceHandler } from './ServiceHandler';

function toMicroName(microservice?: boolean, name?: string) {
    if(!name) return microservice? 'MICRO' : '';
    return microservice ? 'MICRO_' + (name ?? '') : name
}

export function getFiltersToken(transport: Transport, microservice?: boolean): Token<FilterLike[]> {
    return getToken<FilterLike[]>(`${Transport[transport].toUpperCase()}_FILTERS`, toMicroName(microservice));
}


export function getInterceptorsToken(transport: Transport, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptor[]>(`${Transport[transport].toUpperCase()}_INTERCEPTORS`, toMicroName(microservice));
}



export function getTransfersToken(transport: Transport, microservice?: boolean): Token<RequestInterceptorLike[]> {
    return getToken<RequestInterceptorLike[]>(`${Transport[transport].toUpperCase()}_TRANSFERS`, toMicroName(microservice));
}


export function getRouterToken(transport: Transport, microservice?: boolean): Token<Router> {
    return getToken(Router, Transport[transport] + '_' + toMicroName(microservice));
}




export function getServiceOptionsToken(transport: Transport, microservice?: boolean, name?: string): Token<ServiceConfig> {
    return getToken<ServiceConfig>(`${Transport[transport].toUpperCase()}_OPTIONS`, toMicroName(microservice, name));
}

export function getServiceHandlerToken(transport: Transport, microservice?: boolean, name?: string): Token<ServiceHandler> {
    return getToken<ServiceHandler>(`${Transport[transport].toUpperCase()}_HANDLER`, toMicroName(microservice, name));
}


export function getServiceToken<T>(transport: Transport, microservice?: boolean, name?: string): Token<Invocation<T>> {
    return getToken<Invocation<T>>(`${Transport[transport].toUpperCase()}_SERVICE`, toMicroName(microservice, name));
}
