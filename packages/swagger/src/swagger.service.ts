/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/scottie1984/swagger-ui-express/blob/master/LICENSE
 */


import { ApplicationContext, Started, TransportParameter } from '@tsdi/core';
import { EMPTY_OBJ, Execption, InjectFlags, Injectable, Type, getClassName, isNil, isString } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { HTTP_LISTEN_OPTS, joinPath } from '@tsdi/common';
import { AssetContext, Content, ControllerRoute, HybridRouter, RouteMappingMetadata, Router, ctype } from '@tsdi/transport';
import { HttpServer } from '@tsdi/transport-http'
import { of } from 'rxjs';
import { getAbsoluteFSPath } from 'swagger-ui-dist';
import { SWAGGER_SETUP_OPTIONS, SWAGGER_DOCUMENT, JsonObject, SwaggerOptions, SwaggerUiOptions, SwaggerSetupOptions } from './swagger.json';
import { ApiParamMetadata } from './metadata';



@Injectable()
export class SwaggerService {

    @InjectLog() logger!: Logger;


    private swaggerInit?: string;

    @Started()
    setup(ctx: ApplicationContext) {

        const { options, ...cfg } = ctx.get(SWAGGER_SETUP_OPTIONS) ?? EMPTY_OBJ;
        const opts = {
            options: {
                swagger: '2.0',
                version: '1.0',
                produces: ["application/json"],
                ...options
            },
            ...cfg
        } as SwaggerSetupOptions;

        const jsonDoc: JsonObject = {
            paths: {}
        }
        const router = ctx.get(HybridRouter);

        this.buildDoc(router, jsonDoc);

        const doc = {
            openapi: '3.0.0',
            info: {
                title: opts.title,
                description: opts.description,
                version: opts.version ?? '1.0.0',
                contact: {}
            },
            ...ctx.get(SWAGGER_DOCUMENT),
            ...jsonDoc
        };

        const fspath = getAbsoluteFSPath();


        const http = ctx.get(HttpServer);

        http.useInterceptors(Content.create({
            root: fspath,
            baseUrl: false,
            index: false
        }), 1);

        http.useInterceptors({
            intercept: (input, next) => {
                if (input.url.endsWith('swagger-ui-init.js')) {
                    input.contentType = ctype.APPL_JAVASCRIPT;
                    input.body = this.swaggerInit;
                    return of(input.response);
                } else {
                    return next.handle(input);
                }
            }
        }, 2);

        const prefix = opts.prefix ?? 'api-doc';
        router.use(prefix, async (ctx, next) => {
            const html = this.generateHTML(doc, opts.opts, opts.options, opts.customCss, opts.customfavIcon, opts.swaggerUrl, opts.customSiteTitle);
            (ctx as AssetContext).contentType = ctype.TEXT_HTML;
            (ctx as AssetContext).body = html;
        });

        const httpopts = ctx.get(HTTP_LISTEN_OPTS);
        this.logger.info('Swagger started!', 'access with url:', `http${httpopts.withCredentials ? 's' : ''}://${httpopts.host}:${httpopts.port}/${prefix}`, '!')

    }


    buildDoc(router: Router | HybridRouter, jsonDoc: JsonObject, prefix?: string) {
        router.routes.forEach((v, route) => {
            if (route.endsWith('**')) route = route.substring(0, route.length - 2);
            if (v instanceof ControllerRoute) {
                v.ctrlRef.class.defs.forEach(df => {
                    if (df.decorType !== 'method' || !isString((df.metadata as RouteMappingMetadata).route)) return;
                    const path = joinPath(prefix, route, df.metadata.route as string);

                    if(!jsonDoc.paths[path]) {
                        jsonDoc.paths[path] = {};
                    }
                    const api: Record<string, any> = jsonDoc.paths[path];
                    const method = df.metadata.method?.toLowerCase() ?? 'get';
                    if (api[method]) throw new Execption(`has mutil route address ${path}, with same method ${method}`);
                    api[method] = {
                        "x-swagger-router-controller": v.ctrlRef.class.className,
                        description: "",
                        operationId: df.propertyKey,
                        tags: [v.ctrlRef.class.className],
                        parameters: v.ctrlRef.class.getParameters(df.propertyKey)?.filter(p => !p.autowired)?.map(p => {
                            return {
                                name: p.name,
                                type: this.toDocType(p.type),
                                in: this.toDocIn((p as TransportParameter).scope),
                                required: isNil((p as ApiParamMetadata).required) ? !p.nullable || !(p.flags && (p.flags & InjectFlags.Optional) > 0) : (p as ApiParamMetadata).required
                            }
                        })
                    }
                });
            } else if (v instanceof Router) {
                this.buildDoc(v, jsonDoc, route);
            }
        })
    }

    toDocType(type?: Type): string {
        if (!type) return '';
        if (type === String) return 'string';
        if (type === Number) return 'number';
        if (type === Date) return 'Datetime';
        if (type === Boolean) return 'boolean';
        return getClassName(type);
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
        customfavIcon?: string | boolean,
        swaggerUrl?: string | boolean,
        customSiteTitle?: string,
        htmlTplString?: string,
        jsTplString?: string): string {

        let isExplorer, customJs, customJsStr, swaggerUrls, customCssUrl, customRobots;

        if (opts && typeof opts === 'object') {
            options = opts.swaggerOptions;
            customCss = opts.customCss;
            customJs = opts.customJs;
            customJsStr = opts.customJsStr;
            customfavIcon = opts.customfavIcon;
            customRobots = opts.customRobots;
            swaggerUrl = opts.swaggerUrl;
            swaggerUrls = opts.swaggerUrls;
            isExplorer = opts.explorer || !!swaggerUrls;
            customSiteTitle = opts.customSiteTitle;
            customCssUrl = opts.customCssUrl;
        } else {
            //support legacy params based function
            isExplorer = opts;
        }
        options = options || {};
        const explorerString = isExplorer ? '' : '.swagger-ui .topbar .download-url-wrapper { display: none }';
        customCss = explorerString + ' ' + customCss || explorerString;
        customfavIcon = customfavIcon || false;
        customSiteTitle = customSiteTitle || 'Swagger UI';
        htmlTplString = htmlTplString || _htmlTplString;
        jsTplString = jsTplString || _jsTplString;

        const robotsMetaString = customRobots ? '<meta name="robots" content="' + customRobots + '" />' : ''
        const favIconString = customfavIcon ? '<link rel="icon" href="' + customfavIcon + '" />' : favIconHtml
        const htmlWithCustomCss = htmlTplString.toString().replace('<% customCss %>', customCss)
        const htmlWithCustomRobots = htmlWithCustomCss.replace('<% robotsMetaString %>', robotsMetaString)
        const htmlWithFavIcon = htmlWithCustomRobots.replace('<% favIconString %>', favIconString)
        const htmlWithCustomJsUrl = htmlWithFavIcon.replace('<% customJs %>', toTags(customJs, toExternalScriptTag))
        const htmlWithCustomJs = htmlWithCustomJsUrl.replace('<% customJsStr %>', toTags(customJsStr, toInlineScriptTag))
        const htmlWithCustomCssUrl = htmlWithCustomJs.replace('<% customCssUrl %>', toTags(customCssUrl, toExternalStylesheetTag))

        const initOptions = {
            swaggerDoc: swaggerDoc || undefined,
            customOptions: options,
            swaggerUrl: swaggerUrl || undefined,
            swaggerUrls: swaggerUrls || undefined
        }

        this.swaggerInit = jsTplString.toString().replace('<% swaggerOptions %>', stringify(initOptions))
        return htmlWithCustomCssUrl.replace('<% title %>', customSiteTitle)
    }
}



const _htmlTplString = `
<!-- HTML for static distribution bundle build -->
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <% robotsMetaString %>
        <title><% title %></title>
        <link rel="stylesheet" type="text/css" href="./swagger-ui.css" >
        <% favIconString %>
        <style>
            html {
                box-sizing: border-box;
                overflow: -moz-scrollbars-vertical;
                overflow-y: scroll;
            }
            *,*:before,*:after {
                box-sizing: inherit;
            }
            body {
                margin:0;
                background: #fafafa;
            }
        </style>
    </head>
    <body>
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="position:absolute;width:0;height:0">
            <defs>
                <symbol viewBox="0 0 20 20" id="unlocked">
                    <path d="M15.8 8H14V5.6C14 2.703 12.665 1 10 1 7.334 1 6 2.703 6 5.6V6h2v-.801C8 3.754 8.797 3 10 3c1.203 0 2 .754 2 2.199V8H4c-.553 0-1 .646-1 1.199V17c0 .549.428 1.139.951 1.307l1.197.387C5.672 18.861 6.55 19 7.1 19h5.8c.549 0 1.428-.139 1.951-.307l1.196-.387c.524-.167.953-.757.953-1.306V9.199C17 8.646 16.352 8 15.8 8z"></path>
                </symbol>

                <symbol viewBox="0 0 20 20" id="locked">
                    <path d="M15.8 8H14V5.6C14 2.703 12.665 1 10 1 7.334 1 6 2.703 6 5.6V8H4c-.553 0-1 .646-1 1.199V17c0 .549.428 1.139.951 1.307l1.197.387C5.672 18.861 6.55 19 7.1 19h5.8c.549 0 1.428-.139 1.951-.307l1.196-.387c.524-.167.953-.757.953-1.306V9.199C17 8.646 16.352 8 15.8 8zM12 8H8V5.199C8 3.754 8.797 3 10 3c1.203 0 2 .754 2 2.199V8z"/>
                </symbol>

                <symbol viewBox="0 0 20 20" id="close">
                    <path d="M14.348 14.849c-.469.469-1.229.469-1.697 0L10 11.819l-2.651 3.029c-.469.469-1.229.469-1.697 0-.469-.469-.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-.469-.469-.469-1.228 0-1.697.469-.469 1.228-.469 1.697 0L10 8.183l2.651-3.031c.469-.469 1.228-.469 1.697 0 .469.469.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c.469.469.469 1.229 0 1.698z"/>
                </symbol>

                <symbol viewBox="0 0 20 20" id="large-arrow">
                    <path d="M13.25 10L6.109 2.58c-.268-.27-.268-.707 0-.979.268-.27.701-.27.969 0l7.83 7.908c.268.271.268.709 0 .979l-7.83 7.908c-.268.271-.701.27-.969 0-.268-.269-.268-.707 0-.979L13.25 10z"/>
                </symbol>

                <symbol viewBox="0 0 20 20" id="large-arrow-down">
                    <path d="M17.418 6.109c.272-.268.709-.268.979 0s.271.701 0 .969l-7.908 7.83c-.27.268-.707.268-.979 0l-7.908-7.83c-.27-.268-.27-.701 0-.969.271-.268.709-.268.979 0L10 13.25l7.418-7.141z"/>
                </symbol>


                <symbol viewBox="0 0 24 24" id="jump-to">
                    <path d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7z"/>
                </symbol>

                <symbol viewBox="0 0 24 24" id="expand">
                    <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
                </symbol>

            </defs>
        </svg>

        <div id="swagger-ui"></div>

        <script src="./swagger-ui-bundle.js"> </script>
        <script src="./swagger-ui-standalone-preset.js"> </script>
        <script src="./swagger-ui-init.js"> </script>
        <% customJs %>
        <% customJsStr %>
        <% customCssUrl %>
        <style>
            <% customCss %>
        </style>
    </body>
</html>
`

const _jsTplString = `
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  <% swaggerOptions %>
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.preauthorizeApiKey) {
    const key = customOptions.preauthorizeApiKey.authDefinitionKey;
    const value = customOptions.preauthorizeApiKey.apiKeyValue;
    if (!!key && !!value) {
      const pid = setInterval(() => {
        const authorized = ui.preauthorizeApiKey(key, value);
        if(!!authorized) clearInterval(pid);
      }, 500)

    }
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}
`

const favIconHtml = '<link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32" />' +
    '<link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16" />';

function stringify(obj: any): string {
    const placeholder = '____FUNCTIONPLACEHOLDER____'
    const fns: any[] = []
    let json = JSON.stringify(obj, (key, value) => {
        if (typeof value === 'function') {
            fns.push(value)
            return placeholder
        }
        return value
    }, 2)
    json = json.replace(new RegExp('"' + placeholder + '"', 'g'), () => fns.shift())
    return 'var options = ' + json + ';'
}

function toExternalScriptTag(url: string) {
    return `<script src='${url}'></script>`
}

function toInlineScriptTag(jsCode: string) {
    return `<script>${jsCode}</script>`
}

function toExternalStylesheetTag(url: string) {
    return `<link href='${url}' rel='stylesheet'>`
}

function toTags(customCode: string | string[] | undefined, toScript: (input: string) => string) {
    if (typeof customCode === 'string') {
        return toScript(customCode)
    } else if (Array.isArray(customCode)) {
        return customCode.map(toScript).join('\n')
    } else {
        return ''
    }
}