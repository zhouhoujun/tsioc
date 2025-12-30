import { AbstractRequest, RequestContext, RequestHandlerFn, RequestInterceptorFn, ResponseEvent, StatusIncoming } from '@tsdi/common';
import { ContextToken } from '@tsdi/ioc';
import { mergeMap, Observable, of } from 'rxjs';


export abstract class Redirector<TReq extends AbstractRequest<any> = AbstractRequest<any>, TRes extends StatusIncoming = StatusIncoming> {
    abstract need(res: TRes, context: RequestContext): boolean;
    abstract redirect(req: TReq, res: TRes, handler: RequestHandlerFn, context: RequestContext): Observable<TRes>;
}


export class RedirectState {
    public follow: number;
    public counter: number;
    public redirect: 'manual' | 'error' | 'follow' | '';
    constructor(init: {
        follow?: number;
        counter?: number;
        redirect?: 'manual' | 'error' | 'follow' | '';
    } = {}) {
        this.follow = init.follow ?? 20;
        this.counter = init.counter ?? 0;
        this.redirect = init.redirect ?? 'follow';
    }
}

export const REDIRECT_STATE = new ContextToken(() => new RedirectState());


export const redirectInterceptor: RequestInterceptorFn = (req, next, context) => {
    return next(req, context)
        .pipe(
            mergeMap(r => {
                const redirector = context.get(Redirector);
                if (redirector && redirector.need(r, context)) {
                    return redirector.redirect(req, r, next, context)
                }

                return of(r);
            })
        )
}


