import { ApplicationContext, Runner } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { SWAGGER_CONFIGS } from './swagger.json';

@Injectable()
export class SwaggerService {

    @Runner()
    setup(ctx: ApplicationContext) {

        ctx.get(SWAGGER_CONFIGS)
    }
}
