import { getToken, Token, Invocation } from '@tsdi/ioc';
import { GuardLike } from '@tsdi/core';
import { Transport, RequestInterceptorLike, RequestFilterLike } from '@tsdi/common';
import { Router } from './router';
import { MiddlewareLike } from './middleware';
import { ServiceConfig } from './options';


function toMicroName(microservice?: boolean, name?: string) {
    if (!name) return microservice ? 'MICRO' : '';
    return microservice ? 'MICRO_' + (name ?? '') : name;
}

export function getServiceGuardsToken(config: ServiceConfig): Token<GuardLike[]> {
    if (!config.guardsToken) {
        config.guardsToken = getToken<GuardLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_GUARDS`, toMicroName(config.microservice));
    }
    return config.guardsToken;
}

export function getServiceFiltersToken(config: ServiceConfig): Token<RequestFilterLike[]> {
    if (!config.filtersToken) {
        config.filtersToken = getToken<RequestFilterLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_FILTERS`, toMicroName(config.microservice));
    }
    return config.filtersToken;
}

export function getServiceInterceptorsToken(config: ServiceConfig): Token<RequestInterceptorLike[]> {
    if (!config.interceptorsToken) {
        config.interceptorsToken = getToken<RequestInterceptorLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_INTERCEPTORS`, toMicroName(config.microservice));
    }
    return config.interceptorsToken;
}

export function getServiceMiddlewaresToken(config: ServiceConfig): Token<MiddlewareLike[]> {
    if (!config.middlewaresToken) {
        config.middlewaresToken = getToken<MiddlewareLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_MIDDLEWARES`, toMicroName(config.microservice));
    }
    return config.middlewaresToken;
}

export function getServiceTransfersToken(config: ServiceConfig): Token<RequestInterceptorLike[]> {
    if (!config.transfersToken) {
        config.transfersToken = getToken<RequestInterceptorLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_TRANSFERS`, toMicroName(config.microservice));
    }
    return config.transfersToken;
}

export function getServiceRouterToken(config: ServiceConfig): Token<Router> {
    if (!config.routerToken) {
        config.routerToken = getToken(Router, Transport[config.transport] + '_MICRO_' + toMicroName(config.microservice));
    }
    return config.routerToken;
}

export function getServiceOptionsToken(config: ServiceConfig): Token<ServiceConfig> {
    return getToken<ServiceConfig>(`${Transport[config.transport].toUpperCase()}_OPTIONS`, toMicroName(config.microservice, config.name));
}

export function getServiceHandlerToken(config: ServiceConfig): Token<any> {
    return getToken<any>(`${Transport[config.transport].toUpperCase()}_HANDLER`, toMicroName(config.microservice, config.name));
}

export function getServiceBackendToken(config: ServiceConfig): Token<any> {
    if(!config.backendToken) {
        config.backendToken = getToken<any>(`${Transport[config.transport].toUpperCase()}_BACKEND`, toMicroName(config.microservice, config.name));
    }
    return config.backendToken;
}

export function getServiceToken(config: ServiceConfig): Token<Invocation> {
    return getToken<Invocation>(`${Transport[config.transport].toUpperCase()}_SERVICE`, toMicroName(config.microservice, config.name));
}
