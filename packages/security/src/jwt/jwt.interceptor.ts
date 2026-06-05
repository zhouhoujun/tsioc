import * as jwt from 'jsonwebtoken';
import { Injectable, lang } from '@tsdi/ioc';
import { OutgoingMessage, RequestContext, RequestInterceptor, RequestHandler } from '@tsdi/common';
import { getRestfulAdapter } from '../context';
import { defer, mergeMap, Observable, throwError } from 'rxjs';
import { InvalidTokenException } from '../exceptions';
import { Authenticator } from '../Authenticator';
import { JWTOption } from './jwt.config';




@Injectable()
export class JwtInterceptor implements RequestInterceptor<RequestContext, OutgoingMessage> {

    intercept(input: RequestContext, next: RequestHandler, context?: any): Observable<any> {
        const option = input.get(JWTOption);
        const token = this.getToken(input, option);
        if (!token) return throwError(() => new InvalidTokenException('no token'));

        return defer(() => {
            const defer = lang.defer();
            jwt.verify(token, option.secret, option.options, (err, decoded) => {
                if (err) {
                    defer.reject(new InvalidTokenException(err.message));
                }
                input.get(Authenticator).login(input, decoded)
                    .then(() => {
                        defer.resolve();
                    }).catch(err => {
                        defer.reject(new InvalidTokenException(err.message));
                    })
            });
            return defer.promise;
        }).pipe(
            mergeMap(() => next.handle(input, context))
        );
    }

    getToken(ctx: RequestContext, option: JWTOption) {
        const adapter = getRestfulAdapter(ctx);
        switch (option.tokenIn) {
            case 'header':
                return parseAuthHeader(adapter.getHeader(option.tokenName))?.value;
            case 'query':
                return adapter.query[option.tokenName];
            case 'body':
                return adapter.request.body[option.tokenName];
        }
    }
}

const matcExp = /(\S+)\s+(\S+)/;
function parseAuthHeader(hdrValue?: string) {
    if (typeof hdrValue !== 'string') {
        return null;
    }
    const matches = hdrValue.match(matcExp);
    return matches && { scheme: matches[1], value: matches[2] };
}