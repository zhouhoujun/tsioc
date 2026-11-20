import { DecorDefine, Invocation } from '@tsdi/ioc';
import { Pattern, PatternFormatter } from '@tsdi/common';
import { createRouteHandler } from './route.handler';
import { MappingDef, RouteMappingMetadata } from './router';
import { Route, Routes } from './route';

/**
 * Raw controller route description. It is intentionally renderer/formatter
 * independent so it can be cached per controller class and, later, emitted by
 * AOT as a `ƿroutes` manifest.
 */
export interface ControllerRouteTemplate {
    propertyKey: string | symbol;
    pattern: Pattern;
    method?: string | string[];
    paths?: Record<string, any>;
    options: RouteMappingMetadata;
}

const templateCache = new WeakMap<object, ControllerRouteTemplate[]>();

function precompiledRoutes(invocation: Invocation): ControllerRouteTemplate[] | undefined {
    const manifest = (invocation.type as any)?.ƿroutes;
    return Array.isArray(manifest) ? manifest as ControllerRouteTemplate[] : undefined;
}

/** Compile (and cache) the route templates declared on a controller class. */
export function compileControllerRouteTemplates(invocation: Invocation): ControllerRouteTemplate[] {
    const precompiled = precompiledRoutes(invocation);
    if (precompiled) {
        return precompiled;
    }
    const classRef = invocation.classRef;
    let cached = templateCache.get(classRef);
    if (cached) {
        return cached;
    }
    const sortRoutes = classRef
        .getMethodDefines(m => m.metadata && m.metadata.method && typeof m.metadata.route === 'string')
        .sort((left, right) =>
            String(left.metadata.route || '').length - String(right.metadata.route || '').length
        ) as DecorDefine<RouteMappingMetadata>[];
    const anno = classRef.getAnnotation<MappingDef>();
    cached = sortRoutes.map(member => {
        const options = { ...member.metadata };
        if (anno.interceptors) {
            options.interceptors = [...(anno.interceptors ?? []), ...(options.interceptors ?? [])];
        }
        if (anno.guards) {
            options.guards = [...anno.guards, ...(options.guards ?? [])];
        }
        if (anno.filters) {
            options.filters = [...anno.filters, ...(options.filters ?? [])];
        }
        return {
            propertyKey: member.propertyKey,
            pattern: member.metadata.route as Pattern,
            method: member.metadata.method,
            paths: member.metadata.paths,
            options
        };
    });
    templateCache.set(classRef, cached);
    return cached;
}

/** Instantiate concrete routes for one controller/invocation and prefix. */
export function createControllerRoutes(
    invocation: Invocation,
    prefix: string,
    pathParams: Record<string, number> | undefined,
    formatter: PatternFormatter
): Routes {
    return compileControllerRouteTemplates(invocation).map(template => ({
        path: formatter.format(template.pattern),
        pattern: template.pattern,
        prefix,
        method: template.method,
        pathParams: pathParams ? { ...pathParams } : undefined,
        paths: template.paths,
        handler: createRouteHandler(invocation, template.options, template.propertyKey)
    } as Route));
}
