import { Injectable } from '@tsdi/ioc';
import { Incoming, OutgoingMessage, RequestContext, RequestHandler, RequestInterceptor, UnauthorizedException } from '@tsdi/common';
import { getStatusAdapter } from '../context';
import { Observable, defer, mergeMap, throwError } from 'rxjs';
import { Authenticator } from '../Authenticator';
import { BasicAuthOptions } from './basic.config';



@Injectable()
export class BasicAuthInterceptor implements RequestInterceptor<RequestContext, OutgoingMessage> {
    constructor(private authenticator: Authenticator) {}

    intercept(input: RequestContext, next: RequestHandler, context?: any): Observable<any> {
        const authHeader = getStatusAdapter(input).getHeader('authorization');
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

        getStatusAdapter(ctx).setHeader(
            'WWW-Authenticate',
            `Basic realm="${realm}", charset="${charset}"`
        );
        
        return throwError(() => 
            new UnauthorizedException('Authentication required')
        );
    }
} 