import { HeaderRecord, StatusCode, TransportRequest } from '@tsdi/common';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';


@Abstract()
export abstract class Redirector {
    /**
     * redirect.
     */
    abstract redirect<T>(req: TransportRequest, status: StatusCode, headers: HeaderRecord): Observable<T>
}

