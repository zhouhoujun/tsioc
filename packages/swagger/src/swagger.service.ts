import { ApplicationContext, ControllerRoute, RouteMappingMetadata, Router, Started, joinPath, normalize } from '@tsdi/core';
import { EMPTY_OBJ, Injectable, isString } from '@tsdi/ioc';
import { JsonObject, serve, setup } from 'swagger-ui-express';
import { SWAGGER_SETUP_OPTIONS, SWAGGER_DOCUMENT } from './swagger.json';
import { compose } from 'koa-convert';

@Injectable()
export class SwaggerService {


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
    }

    buildDoc(router: Router, jsonDoc: JsonObject, prefix?: string) {
        router.routes.forEach((v, route) => {
            if (v instanceof ControllerRoute) {
                v.ctrlRef.class.defs.forEach(df => {
                    if (df.decorType !== 'method' || !isString((df.metadata as RouteMappingMetadata).route)) return;
                    if(jsonDoc.paths[joinPath(prefix, route, df.metadata.route as string)]) return;
                    const api: Record<string, any> = {};
                    api[df.metadata.method?.toLowerCase() ?? 'get'] = {
                        "x-swagger-router-controller": v.ctrlRef.class.className,
                        description: "",
                        operationId: df.propertyKey,
                        tags: [df.metadata.route],
                        parameters:[]
                    }
                    jsonDoc.paths[joinPath(prefix, route, df.metadata.route as string)] = api;
                });
                // jsonDoc.paths[v.ctrlRef.class.] = {

                // };
            } else if (v instanceof Router) {
                this.buildDoc(v, jsonDoc, route);
            }
        })
    }
}
