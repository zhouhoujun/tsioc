import { getToken, token, Token, Invocation } from '@tsdi/ioc';
import { GuardLike } from '@tsdi/core';
import { Transport, RequestInterceptorLike, RequestFilterLike } from '@tsdi/common';
import { Router } from './router';
import { MiddlewareLike } from './middleware';
import { AuthOptions, CorsOptions, ServiceConfig, ServiceOptions } from './options';
import { GracefulShutdownOptions, HealthOptions, RegistrationOptions } from './features';


function toMicroName(microservice?: boolean, name?: string) {
    if (!name) return microservice ? 'MICRO' : '';
    return microservice ? 'MICRO_' + (name ?? '') : name;
}

export function getServiceGuardsToken(config: ServiceConfig): Token<GuardLike[]> {
    if (!config.features.guardsToken) {
        config.features.guardsToken = getToken<GuardLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_GUARDS`, toMicroName(config.microservice));
    }
    return config.features.guardsToken;
}

export function getServiceFiltersToken(config: ServiceConfig): Token<RequestFilterLike[]> {
    if (!config.features.filtersToken) {
        config.features.filtersToken = getToken<RequestFilterLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_FILTERS`, toMicroName(config.microservice));
    }
    return config.features.filtersToken;
}

export function getServiceInterceptorsToken(config: ServiceConfig): Token<RequestInterceptorLike[]> {
    if (!config.features.interceptorsToken) {
        config.features.interceptorsToken = getToken<RequestInterceptorLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_INTERCEPTORS`, toMicroName(config.microservice));
    }
    return config.features.interceptorsToken;
}

export function getServiceMiddlewaresToken(config: ServiceConfig): Token<MiddlewareLike[]> {
    if (!config.features.middlewaresToken) {
        config.features.middlewaresToken = getToken<MiddlewareLike[]>(`${Transport[config.transport].toUpperCase()}_MICRO_MIDDLEWARES`, toMicroName(config.microservice));
    }
    return config.features.middlewaresToken;
}

export function getServiceRouterToken(config: ServiceConfig): Token<Router> {
    if (!config.features.routerToken) {
        config.features.routerToken = getToken(Router, Transport[config.transport] + '_MICRO_' + toMicroName(config.microservice));
    }
    return config.features.routerToken;
}

export function getServiceOptionsToken(config: ServiceConfig): Token<ServiceConfig> {
    return getToken<ServiceConfig>(`${Transport[config.transport].toUpperCase()}_OPTIONS`, toMicroName(config.microservice, config.name));
}

export function getServiceHandlerToken(config: ServiceConfig): Token<any> {
    return getToken<any>(`${Transport[config.transport].toUpperCase()}_HANDLER`, toMicroName(config.microservice, config.name));
}

export function getServiceBackendToken(config: ServiceConfig): Token<any> {
    if(!config.features.backendToken) {
        config.features.backendToken = getToken<any>(`${Transport[config.transport].toUpperCase()}_BACKEND`, toMicroName(config.microservice, config.name));
    }
    return config.features.backendToken;
}

export function getServiceToken(config: ServiceConfig): Token<Invocation> {
    return getToken<Invocation>(`${Transport[config.transport].toUpperCase()}_SERVICE`, toMicroName(config.microservice, config.name));
}

/**
 * Option tokens consumed by feature interceptors, strategies and handlers.
 *
 * They live here (instead of provider.ts) so implementations imported by the
 * provider can inject them without a circular value import.
 */
export const SERVICE_REGISTRATION_OPTIONS = token<RegistrationOptions>('SERVICE_REGISTRATION_OPTIONS');
export const SERVICE_HEALTH_OPTIONS = token<HealthOptions>('SERVICE_HEALTH_OPTIONS');
export const SERVICE_GRACEFUL_SHUTDOWN_OPTIONS = token<GracefulShutdownOptions>('SERVICE_GRACEFUL_SHUTDOWN_OPTIONS');
export const SERVICE_STATICS_OPTIONS = token<any>('SERVICE_STATICS_OPTIONS');
/** @deprecated use SERVICE_STATICS_OPTIONS */
export const SERVICE_CONTENT_OPTIONS = SERVICE_STATICS_OPTIONS;
export const SERVICE_AUTH_OPTIONS = token<AuthOptions>('SERVICE_AUTH_OPTIONS');
export const SERVICE_BODY_PARSER_OPTIONS = token<any>('SERVICE_BODY_PARSER_OPTIONS');
export const SERVICE_BODY_SERIALIZER_OPTIONS = token<any>('SERVICE_BODY_SERIALIZER_OPTIONS');
export const SERVICE_JSON_OPTIONS = token<any>('SERVICE_JSON_OPTIONS');
export const SERVICE_SESSION_OPTIONS = token<any>('SERVICE_SESSION_OPTIONS');
export const SERVICE_COOKIE_OPTIONS = token<any>('SERVICE_COOKIE_OPTIONS');
export const SERVICE_CORS_OPTIONS = token<CorsOptions>('SERVICE_CORS_OPTIONS');
export const SERVICE_CONFIGS = token<ServiceOptions[]>('SERVICE_CONFIGS');
export const SERV_OPTIONS = token<ServiceOptions>('SERV_OPTIONS');
