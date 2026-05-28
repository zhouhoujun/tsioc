import { Injectable } from '@tsdi/ioc';
import { RequestInterceptor, RequestHandler, RequestContext } from '@tsdi/common';
import { Observable, defer } from 'rxjs';
import { HttpHandlerOutput, HttpRequestMessage } from '../http-context';

export interface Session {
    id: string;
    data: Record<string, unknown>;
    secret?: string;
    createdAt: number;
    updatedAt: number;
}

type HttpSessionRequest = HttpRequestMessage & { _session?: Session | null };

@Injectable()
export class HttpSessionInterceptor implements RequestInterceptor<HttpRequestMessage, HttpHandlerOutput, RequestContext> {

    intercept(input: HttpRequestMessage, next: RequestHandler<HttpRequestMessage, HttpHandlerOutput, RequestContext>, context: RequestContext): Observable<HttpHandlerOutput> {
        const req = context.get('request') as HttpSessionRequest;

        if (!req._session) {
            req._session = this.createSession();
        }

        const session = req._session!;
        session.updatedAt = Date.now();

        context.set('session', session);

        return defer(() => {
            return next.handle(input, context);
        });
    }

    getSession(context: RequestContext): Session | null {
        const req = context.get('request') as HttpSessionRequest | null;
        return req?._session ?? null;
    }

    setSession(context: RequestContext, session: Session): void {
        const req = context.get('request') as HttpSessionRequest | null;
        if (req) {
            req._session = session;
            context.set('session', session);
        }
    }

    createSession(): Session {
        return {
            id: this.generateSessionId(),
            data: {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    }

    destroySession(context: RequestContext): void {
        const req = context.get('request') as HttpSessionRequest | null;
        if (req) {
            req._session = null;
            context.set('session', null);
        }
    }

    private generateSessionId(): string {
        return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
