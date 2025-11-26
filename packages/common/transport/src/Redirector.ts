import { Abstract } from '@tsdi/ioc';
import { AbstractRequest, HeadersLike, RequestContext } from '@tsdi/common';
import { Observable } from 'rxjs';


@Abstract()
export abstract class Redirector<TStatus = any> {
    /**
     * redirect.
     */
    abstract redirect<T>(req: AbstractRequest<any>, context: RequestContext, status: TStatus, headers: HeadersLike, protocol: string): Observable<T>
}

