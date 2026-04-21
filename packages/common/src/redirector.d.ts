import { ContextToken } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { AbstractRequest } from './request';
import { RequestContext } from './context';
import { RequestHandlerFn } from './handler';
import { RequestInterceptorFn } from './interceptor';
import { ClientIncoming } from './incoming';
export declare abstract class Redirector<TReq extends AbstractRequest<any> = AbstractRequest<any>, TRes extends ClientIncoming = ClientIncoming> {
    abstract need(res: TRes, context: RequestContext): boolean;
    abstract redirect(req: TReq, res: TRes, handler: RequestHandlerFn, context: RequestContext): Observable<TRes>;
}
export declare class RedirectState {
    follow: number;
    counter: number;
    redirect: 'manual' | 'error' | 'follow' | '';
    constructor(init?: {
        follow?: number;
        counter?: number;
        redirect?: 'manual' | 'error' | 'follow' | '';
    });
}
export declare const REDIRECT_STATE: ContextToken<RedirectState>;
export declare const redirectInterceptor: RequestInterceptorFn;
