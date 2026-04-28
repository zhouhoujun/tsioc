import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { Incoming, ReadableLike, RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { Observable, finalize, from, mergeMap, catchError, throwError } from 'rxjs';
import { Session, SESSION_OPTIONS, SessionOptions } from '../sessions/Session';



/**
 * session.
 */
@Injectable()
export class SessionInterceptor implements RequestInterceptor<ReadableLike<Incoming>> {

    private options: SessionOptions;
    constructor(@Optional() @Inject(SESSION_OPTIONS) options?: SessionOptions) {
        this.options = options ?? defOpts;
    }

    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, any>, context: RequestContext): Observable<any> {
        const session = context.get(Session);
        if (!session) {
            return next.handle(input, context);
        }

        // 添加错误处理和状态检查
        return from(session.load())
            .pipe(
                mergeMap(() => {
                    if (!session.isValid()) {
                        return throwError(() => new Error('Invalid session'));
                    }
                    return next.handle(input, context);
                }),
                catchError(error => {
                    console.error('Session error:', error);
                    return throwError(() => error);
                }),
                finalize(() => {
                    if (this.options?.autoCommit && session.isModified()) {
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
