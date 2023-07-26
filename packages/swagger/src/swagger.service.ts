import { ApplicationContext, Started, TransportParameter } from '@tsdi/core';
import { EMPTY_OBJ, Execption, InjectFlags, Injectable, isNil, isString } from '@tsdi/ioc';
import { HTTP_LISTEN_OPTS, joinPath } from '@tsdi/common';
import { ControllerRoute, RouteMappingMetadata, Router } from '@tsdi/transport';
import { JsonObject, serve, setup } from 'swagger-ui-express';
import { SWAGGER_SETUP_OPTIONS, SWAGGER_DOCUMENT } from './swagger.json';
import { compose } from 'koa-convert';
import { ApiParamMetadata } from './metadata';
import { InjectLog, Logger } from '@tsdi/logs';

@Injectable()
export class SwaggerService {

    @InjectLog() logger!: Logger;


    @Started()
    setup(ctx: ApplicationContext) {

        const opts = ctx.get(SWAGGER_SETUP_OPTIONS) ?? EMPTY_OBJ;
        const jsonDoc: JsonObject = {
            paths: {}
        }
        const router = ctx.get(Router);

        this.buildDoc(router, jsonDoc);

        const doc = {
            ...ctx.get(SWAGGER_DOCUMENT),
            ...jsonDoc
        };


        router.use(opts.prefix ?? '/api-doc', compose(
            serve as any,
            setup(doc, opts.opts, opts.options, opts.customCss, opts.customfavIcon, opts.swaggerUrl, opts.customSiteTitle) as any
        ));

        const httpopts = ctx.get(HTTP_LISTEN_OPTS);
        this.logger.info('Swagger started!', 'access with url:', `http${httpopts.withCredentials ? 's' : ''}://${httpopts.host}:${httpopts.port}/${opts.prefix ?? 'api-doc'}`, '!')

    }

    buildDoc(router: Router, jsonDoc: JsonObject, prefix?: string) {
        router.routes.forEach((v, route) => {
            if (v instanceof ControllerRoute) {
                v.ctrlRef.class.defs.forEach(df => {
                    if (df.decorType !== 'method' || !isString((df.metadata as RouteMappingMetadata).route)) return;
                    const path = joinPath(prefix, route, df.metadata.route as string);

                    const api: Record<string, any> = { ...jsonDoc.paths[path] };
                    const method = df.metadata.method?.toLowerCase() ?? 'get';
                    if (api[method]) throw new Execption(`has mutil route address ${path}, with same method ${method}`);
                    api[method] = {
                        "x-swagger-router-controller": v.ctrlRef.class.className,
                        description: "",
                        operationId: df.propertyKey,
                        tags: [df.metadata.route],
                        parameters: v.ctrlRef.class.getParameters(df.propertyKey)?.map(p => {
                            return {
                                name: p.name,
                                type: p.type,
                                in: this.toDocIn((p as TransportParameter).scope),
                                required: isNil((p as ApiParamMetadata).required) ? !p.nullable || !(p.flags && (p.flags & InjectFlags.Optional) > 0) : (p as ApiParamMetadata).required
                            }
                        })
                    }
                    jsonDoc.paths[path] = api;
                });
            } else if (v instanceof Router) {
                this.buildDoc(v, jsonDoc, route);
            }
        })
    }

    toDocIn(scope?: 'headers' | 'query' | 'param' | 'path' | 'payload' | 'body' | 'topic') {
        if (!scope) return 'query';
        switch (scope) {
            case 'headers':
                return 'header';
            case 'body':
            case 'payload':
                return 'formData';
            default:
                return scope;
        }
    }
}
