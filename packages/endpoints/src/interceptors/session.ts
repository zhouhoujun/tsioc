import { Injectable } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { Observable, finalize, from, mergeMap, catchError, throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';



/**
 * session.
 */
@Injectable()
export class SessionInterceptor implements Interceptor<RequestContext> {

    intercept(input: RequestContext, next: Handler<RequestContext, any>): Observable<any> {
        const session = input.session;
        if (!session) {
            return next.handle(input);
        }

        // 添加错误处理和状态检查
        return from(session.load())
            .pipe(
                mergeMap(() => {
                    if (!session.isValid()) {
                        return throwError(() => new Error('Invalid session'));
                    }
                    return next.handle(input);
                }),
                catchError(error => {
                    console.error('Session error:', error);
                    return throwError(() => error);
                }),
                finalize(() => {
                    if (input.serverOptions.session?.autoCommit && session.isModified()) {
                        session.commit().catch(err => {
                            console.error('Failed to commit session:', err);
                        });
                    }
                })
            );
    }
}

const defOpts = {
    key: 'endpoints',
    overwrite: true,
    httpOnly: true,
    signed: true,
    autoCommit: true,
    encode,
    decode
};


/**
 * Decode the base64 cookie value to an object.
 *
 * @param {String} string
 * @return {Object}
 * @api private
 */
function decode(str: string): Object {
    const body = Buffer.from(str, 'base64').toString('utf8');
    const json = JSON.parse(body);
    return json;
}

/**
 * Encode an object into a base64-encoded JSON string.
 *
 * @param {Object} body
 * @return {String}
 * @api private
 */
function encode(body: any): string {
    body = JSON.stringify(body);
    return Buffer.from(body).toString('base64')
}
