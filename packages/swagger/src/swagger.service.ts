import { ApplicationContext, Started, TransportParameter } from '@tsdi/core';
import { EMPTY_OBJ, Execption, InjectFlags, Injectable, isNil, isString } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { HTTP_LISTEN_OPTS, joinPath } from '@tsdi/common';
import { AssetContext, Content, ControllerRoute, HybridRouter, RouteMappingMetadata, Router, ctype } from '@tsdi/transport';
import { HttpServer } from '@tsdi/transport-http'
import { getAbsoluteFSPath } from 'swagger-ui-dist';
import { SWAGGER_SETUP_OPTIONS, SWAGGER_DOCUMENT, JsonObject, SwaggerOptions, SwaggerUiOptions } from './swagger.json';
import { ApiParamMetadata } from './metadata';



@Injectable()
export class SwaggerService {

    @InjectLog() logger!: Logger;


    @Started()
    setup(ctx: ApplicationContext) {

        const opts = ctx.get(SWAGGER_SETUP_OPTIONS) ?? EMPTY_OBJ;
        const jsonDoc: JsonObject = {
            paths: {}
        }
        const router = ctx.get(HybridRouter);

        this.buildDoc(router, jsonDoc);

        const doc = {
            ...ctx.get(SWAGGER_DOCUMENT),
            ...jsonDoc
        };

        const fspath = getAbsoluteFSPath();

        
        const http = ctx.get(HttpServer);

        http.useInterceptors(Content.create({
            root: fspath,
            index: false
        }), 1);

        const prefix = opts.prefix ?? 'api-doc';
        router.use(prefix, async (ctx, next) => {
            const html = this.generateHTML(doc, opts.opts, opts.options, opts.customCss, opts.customfavIcon, opts.swaggerUrl, opts.customSiteTitle);
            (ctx as AssetContext).contentType = ctype.TEXT_HTML;
            (ctx as AssetContext).body = html;
        });

        const httpopts = ctx.get(HTTP_LISTEN_OPTS);
        this.logger.info('Swagger started!', 'access with url:', `http${httpopts.withCredentials ? 's' : ''}://${httpopts.host}:${httpopts.port}/${prefix}`, '!')

    }

    /**
     * Generates the custom HTML page for the UI API.
     *
     * @param swaggerDoc JSON object with the API schema.
     * @param opts swagger-ui-express options.
     * @param options custom Swagger options.
     * @param customCss string with a custom CSS to embed into the page.
     * @param customfavIcon link to a custom favicon.
     * @param swaggerUrl URL of the Swagger API schema, can be specified instead of the swaggerDoc.
     * @param customSiteTitle custom title for a page.
     * @returns the generated HTML page.
     */
    generateHTML(
        swaggerDoc?: JsonObject,
        opts?: SwaggerUiOptions,
        options?: SwaggerOptions,
        customCss?: string,
        customfavIcon?: string,
        swaggerUrl?: string,
        customSiteTitle?: string): string {
        return ''
    }

    buildDoc(router: Router | HybridRouter, jsonDoc: JsonObject, prefix?: string) {
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
