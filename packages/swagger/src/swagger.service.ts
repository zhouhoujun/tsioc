import { ApplicationContext, Router, Started } from '@tsdi/core';
import { EMPTY_OBJ, Injectable } from '@tsdi/ioc';
import { serve, setup } from 'swagger-ui-express';
import { SWAGGER_SETUP_OPTIONS, SWAGGER_DOCUMENT } from './swagger.json';
import { compose } from 'koa-convert';

@Injectable()
export class SwaggerService {

    @Started()
    setup(ctx: ApplicationContext) {
        const doc = ctx.get(SWAGGER_DOCUMENT);
        const opts = ctx.get(SWAGGER_SETUP_OPTIONS) ?? EMPTY_OBJ;
        const router = ctx.get(Router);
        router.use(opts.prefix ?? '/api-doc', compose(
            serve as any,
            setup(doc, opts.opts, opts.options, opts.customCss, opts.customfavIcon, opts.swaggerUrl, opts.customSiteTitle) as any
        ));
    }
}
