import { MiddlewareOf } from '@tsdi/core';
import { Abstract, Injectable } from '@tsdi/ioc';
import { ContentMiddleware } from './content';
import { CorsMiddleware } from './cors';
import { CsrfMiddleware } from './csrf';
import { SessionMiddleware } from './session';


@Abstract()
export abstract class MiddlewareFilter {
    abstract filter(middlewares: MiddlewareOf[], opts: {
        cors?: any;
        session?: any;
        csrf?: any;
        content?: any;
    }): MiddlewareOf[];
}


@Injectable()
export class DefaultMiddlewareFilter implements MiddlewareFilter {

    filter(middlewares: MiddlewareOf[], opts: {
        cors?: any;
        session?: any;
        csrf?: any;
        content?: any;
    }): MiddlewareOf[] {
        return middlewares.filter(m => {
            if (!opts.cors && m === CorsMiddleware) return false;
            if (!opts.session && m === SessionMiddleware) return false;
            if (!opts.csrf && m === CsrfMiddleware) return false;
            if (!opts.content && m === ContentMiddleware) return false;
            return true
        })
    }

} 