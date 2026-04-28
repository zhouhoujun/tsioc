import { getToken, Invocation, token, Token } from '@tsdi/ioc';
import { GuardLike, VaildatorLike } from '@tsdi/core';
import { Transport, RequestInterceptorLike, RequestHandlerLike, RequestFilterLike, Outgoing, Incoming, RequestContext } from '@tsdi/common';
import { ServiceConfig, Router } from '@tsdi/endpoints';
import { MiddlewareLike } from '@tsdi/endpoints/middleware';
import { MicroServiceConfig } from './options';
import { ServiceHandler } from './MicroServiceHandler';


export const RESPONSE = token<Outgoing>('MICRO_RESPONSE');

function toMicroName(microservice?: boolean, name?: string) {
    if (!name) return microservice ? 'MICRO' : '';
    return microservice ? 'MICRO_' + (name ?? '') : name;
}

export function getMicroServiceGuardsToken(config: MicroServiceConfig): Token<GuardLike[]> {
    if (!config.guardsToken) {
        config.guardsToken = getToken<GuardLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_GUARDS`, toMicroName(config.microservice));
    }
    return config.guardsToken;
}

export function getMicroServiceFiltersToken(config: MicroServiceConfig): Token<RequestFilterLike[]> {
    if (!config.filtersToken) {
        config.filtersToken = getToken<RequestFilterLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_FILTERS`, toMicroName(config.microservice));
    }
    return config.filtersToken;
}

export function getMicroServiceInterceptorsToken(config: MicroServiceConfig): Token<RequestInterceptorLike[]> {
    if (!config.interceptorsToken) {
        config.interceptorsToken = getToken<RequestInterceptorLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_INTERCEPTORS`, toMicroName(config.microservice));
    }
    return config.interceptorsToken;
}

export function getMicroServiceMiddlewaresToken(config: MicroServiceConfig): Token<MiddlewareLike[]> {
    if (!config.middlewaresToken) {
        config.middlewaresToken = getToken<MiddlewareLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_MIDDLEWARES`, toMicroName(config.microservice));
    }
    return config.middlewaresToken;
}

export function getMicroServiceTransfersToken(config: MicroServiceConfig): Token<RequestInterceptorLike[]> {
    if (!config.transfersToken) {
        config.transfersToken = getToken<RequestInterceptorLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_TRANSFERS`, toMicroName(config.microservice));
    }
    return config.transfersToken;
}

export function getMicroServiceRouterToken(config: MicroServiceConfig): Token<Router> {
    if (!config.routerToken) {
        config.routerToken = getToken(Router, Transport[config.transport] + '_MICRO_' + toMicroName(config.microservice));
    }
    return config.routerToken;
}

export function getMicroServiceOptionsToken(config: MicroServiceConfig): Token<MicroServiceConfig> {
    return getToken<MicroServiceConfig>(`${Transport[config.transport].toUpperCase()}_MICRO_OPTIONS`, toMicroName(config.microservice, config.name));
}

export function getMicroServiceHandlerToken(config: MicroServiceConfig): Token<ServiceHandler> {
    return getToken<ServiceHandler>(`${Transport[config.transport].toUpperCase()}_MICRO_HANDLER`, toMicroName(config.microservice, config.name));
}

export function getMicroServiceBackendToken(config: MicroServiceConfig): Token<RequestHandlerLike> {
    if (!config.backendToken) {
        config.backendToken = getToken<RequestHandlerLike>(`${Transport[config.transport].toUpperCase()}_MICRO_BACKEND`, toMicroName(config.microservice, config.name));
    }
    return config.backendToken;
}

export function getMicroServiceToken<T>(config: MicroServiceConfig): Token<Invocation<T>> {
    return getToken<Invocation<T>>(`${Transport[config.transport].toUpperCase()}_MICRO_SERVICE`, toMicroName(config.microservice, config.name));
}
