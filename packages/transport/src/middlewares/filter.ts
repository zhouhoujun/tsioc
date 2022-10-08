import { MiddlewareFilter, MiddlewareType } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { ContentMiddleware } from './content';
import { CorsMiddleware } from './cors';
import { CsrfMiddleware } from './csrf';
import { SessionMiddleware } from './session';

@Injectable()
export class DefaultMiddlewareFilter implements MiddlewareFilter {

    filter(middlewares: MiddlewareType[], opts: {
        cors?: any;
        session?: any;
        csrf?: any;
        content?: any;
    }): MiddlewareType[] {
        return middlewares.filter(m => {
            if (!opts.cors && m === CorsMiddleware) return false;
            if (!opts.session && m === SessionMiddleware) return false;
            if (!opts.csrf && m === CsrfMiddleware) return false;
            if (!opts.content && m === ContentMiddleware) return false;
            return true
        })
    }

} 