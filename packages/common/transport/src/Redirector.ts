import { Abstract } from '@tsdi/ioc';
import { MapHeaders, UrlRequest } from '@tsdi/common';
import { Observable } from 'rxjs';


@Abstract()
export abstract class Redirector<TStatus = any> {
    /**
     * redirect.
     */
    abstract redirect<T>(req: UrlRequest, status: TStatus, headers: MapHeaders): Observable<T>
}

