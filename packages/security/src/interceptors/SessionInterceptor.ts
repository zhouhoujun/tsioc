import { Abstract, Injectable } from '@tsdi/ioc';
import { ApplicationHandler, ApplicationInterceptor } from '@tsdi/core';
import { OutgoingMessage } from '@tsdi/common/transport';
import { RequestContext, Session } from '@tsdi/endpoints';
import { Observable } from 'rxjs';


@Injectable()
export class SessionInterceptor implements ApplicationInterceptor<RequestContext, OutgoingMessage> {

    intercept(input: RequestContext, next: ApplicationHandler, context?: any): Observable<any> {
        return next.handle(input, context)
    }

}



/**
 * Session storage.
 */
@Abstract()
export abstract class SessionStorage {

    abstract get(key: string, maxAge: number | 'session', data: { rolling: boolean; }): string;

    abstract set(key: string, sess: Partial<Session> & { _expire?: number; _maxAge?: number; }, maxAge: number | 'session', data: { changed: boolean; rolling: boolean; }): void;

    abstract destroy(key: string): void;
}
