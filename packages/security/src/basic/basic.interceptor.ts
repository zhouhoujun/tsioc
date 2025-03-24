import { Injectable } from '@tsdi/ioc';
import { ApplicationHandler, ApplicationInterceptor } from '@tsdi/core';
import { Incoming, OutgoingMessage, UnauthorizedExecption } from '@tsdi/common/transport';
import { RequestContext } from '@tsdi/endpoints';
import { Observable, defer, mergeMap, throwError } from 'rxjs';
import { Authenticator } from '../Authenticator';
import { BasicAuthOptions } from './basic.config';



@Injectable()
export class BasicAuthInterceptor implements ApplicationInterceptor<RequestContext, OutgoingMessage> {
    constructor(private authenticator: Authenticator) {}

    intercept(input: RequestContext, next: ApplicationHandler, context?: any): Observable<any> {
        const authHeader = input.getHeader('authorization');
        if (!authHeader) {
            return this.unauthorized(input);
        }

        const [scheme, credentials] = authHeader.split(' ');
        if (scheme.toLowerCase() !== 'basic') {
            return this.unauthorized(input);
        }

        const decoded = Buffer.from(credentials, 'base64').toString();
        const [username, password] = decoded.split(':');

        if (!username || !password) {
            return this.unauthorized(input);
        }

        return defer(() => 
            this.authenticator.login(input, { username, password })
        ).pipe(
            mergeMap(() => next.handle(input, context)),
        );
    }

    private unauthorized(ctx: RequestContext): Observable<never> {
        const options = ctx.get(BasicAuthOptions) ?? {};
        const realm = options.realm ?? 'Protected Area';
        const charset = options.charset ?? 'UTF-8';
        
        ctx.setHeader(
            'WWW-Authenticate', 
            `Basic realm="${realm}", charset="${charset}"`
        );
        
        return throwError(() => 
            new UnauthorizedExecption('Authentication required')
        );
    }
} 