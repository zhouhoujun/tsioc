import * as jwt from 'jsonwebtoken';

import { Injectable, lang } from '@tsdi/ioc';
import { ApplicationHandler, ApplicationInterceptor } from '@tsdi/core';
import { Incoming, OutgoingMessage, UnauthorizedExecption } from '@tsdi/common/transport';
import { RequestContext } from '@tsdi/endpoints';
import { defer, mergeMap, Observable, throwError } from 'rxjs';
import { InvalidTokenExecption } from '../exceptions';
import { Authenticator } from '../Authenticator';


export class JWTOption {
    constructor(
        readonly secret: jwt.Secret | jwt.PublicKey,
        readonly tokenIn: 'header' | 'query' | 'body' = 'header',
        readonly tokenName: string = 'authentication',
        readonly options?: jwt.VerifyOptions) { }
}

@Injectable()
export class JwtInterceptor implements ApplicationInterceptor<RequestContext, OutgoingMessage> {

    intercept(input: RequestContext, next: ApplicationHandler, context?: any): Observable<any> {
        const option = input.get(JWTOption);
        const token = this.getToken(input, option);
        if (!token) return throwError(() => new InvalidTokenExecption('no token'));

        return defer(() => {
            const defer = lang.defer();
            jwt.verify(token, option.secret, option.options, (err, decoded) => {
                if (err) {
                    defer.reject(new InvalidTokenExecption(err.message));
                }
                input.get(Authenticator).login(input, decoded)
                    .then(() => {
                        defer.resolve();
                    }).catch(err => {
                        defer.reject(new InvalidTokenExecption(err.message));
                    })
            });
            return defer.promise;
        }).pipe(
            mergeMap(() => next.handle(input, context))
        );
    }

    getToken(ctx: RequestContext, option: JWTOption) {
        switch (option.tokenIn) {
            case 'header':
                return parseAuthHeader(ctx.getHeader(option.tokenName))?.value;
            case 'query':
                return ctx.query[option.tokenName];
            case 'body':
                return ctx.request.body[option.tokenName];
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