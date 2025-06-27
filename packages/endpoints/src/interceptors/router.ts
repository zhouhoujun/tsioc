import { Abstract, Handler, Injectable, isUndefined, Nullable, TypeException } from '@tsdi/ioc';
import { ApplicationHandler, ApplicationInterceptor, Backend, InvalidJsonException } from '@tsdi/core';
import { Middleware } from '../middleware/middleware';
import { RequestContext } from '../RequestContext';
import { from, fromEventPattern, Observable } from 'rxjs';
import { OptimizedRouter } from '../router/router.optimize.';
import { Routes } from '../router/route';
import { Incoming, Outgoing } from '@tsdi/common/transport';
import { ServiceConfig } from '../server.options';


@Injectable()
export class RouterInterceptor implements ApplicationInterceptor<RequestContext>, Backend<RequestContext> {

    private router: OptimizedRouter;
    constructor(routes: Routes) {
        this.router = new OptimizedRouter(routes);
    }

    handle(input: RequestContext<Incoming<any, any>, Outgoing<any, any>, any, ServiceConfig<any>, any>, context?: any): Observable<any> {
        throw new Error('Method not implemented.');
    }


    intercept(input: RequestContext, next: Handler<any, Observable<any>, any>, context?: any): Observable<any> {
        const route = this.router.getRoute(input);
        if (route) {
            if (route.handle) {
                return route.handle(input, context);
            }
        }

        return next.handle(input, context);
    }

    private respond() {

    }
}