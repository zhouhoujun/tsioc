import { Abstract } from '@tsdi/ioc';
import { MapHeaders, TransportRequest } from '@tsdi/common';
import { Observable } from 'rxjs';


@Abstract()
export abstract class Redirector<TStatus = any> {
    /**
     * redirect.
     */
    abstract redirect<T>(req: TransportRequest, status: TStatus, headers: MapHeaders): Observable<T>
}

