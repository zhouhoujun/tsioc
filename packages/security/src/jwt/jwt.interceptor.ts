import * as jwt from 'jsonwebtoken';

import { Abstract, Injectable } from '@tsdi/ioc';
import { ApplicationHandler, ApplicationInterceptor } from '@tsdi/core';
import { OutgoingMessage } from '@tsdi/common/transport';
import { RequestContext, Session } from '@tsdi/endpoints';
import { Observable } from 'rxjs';


@Injectable()
export class JwtInterceptor implements ApplicationInterceptor<RequestContext, OutgoingMessage> {

    intercept(input: RequestContext, next: ApplicationHandler, context?: any): Observable<any> {
        return next.handle(input, context)
    }

}

