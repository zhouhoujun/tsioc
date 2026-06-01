import { Abstract, Injectable } from '@tsdi/ioc';
import { OutgoingMessage, RequestHandler, RequestInterceptor, RequestContext, IncomingMessage } from '@tsdi/common';
import { Middleware } from '@tsdi/service';
import { defer, finalize, mergeMap, Observable } from 'rxjs';


export abstract class Session {
    abstract get id(): string;
    abstract get userId(): string | number;
    abstract get createdAt(): number;
    abstract get expiresAt(): number;
    abstract get data(): Record<string, unknown>;
    abstract get cookie(): {
        path?: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'strict' | 'lax' | 'none';
    } | undefined;
}

@Injectable()
export class SessionManager {
    constructor(private readonly sessionStorage: SessionStorage) { }

    async create(sess: Partial<Session>, maxAge: number | 'session' = 'session', rolling = false): Promise<string> {
        const key = this.generateSessionId();
        await this.sessionStorage.set(key, sess, maxAge, { changed: true, rolling });
        return key;
    }

    async get(key: string, maxAge: number | 'session' = 'session', rolling = false): Promise<Session | null> {
        const sessStr = await this.sessionStorage.get(key, maxAge, { rolling });
        return sessStr ? JSON.parse(sessStr) : null;
    }

    async refresh(key: string, maxAge: number | 'session' = 'session') {
        const sess = await this.get(key, maxAge);
        if (sess) {
            await this.sessionStorage.set(key, sess, maxAge, { changed: false, rolling: true });
        }
        return sess ?? null;
    }

    destroy(key: string) {
        this.sessionStorage.destroy(key);
    }

    private generateSessionId(): string {
        return crypto.randomUUID();
    }
}

@Injectable()
export class SessionInterceptor implements Middleware<RequestContext>, RequestInterceptor<IncomingMessage, OutgoingMessage, RequestContext> {

    constructor(private sessionManager: SessionManager) { }

    intercept(input: RequestContext, next: RequestHandler, context: RequestContext): Observable<any> {

        return defer(() => this.loadSession(input)).pipe(
            mergeMap(() => next.handle(input, context)),
            finalize(() => {

            })
        )
    }

    async invoke(ctx: RequestContext, next: () => Promise<void>): Promise<void> {
        const session = await this.loadSession(ctx);
        try {
            await next();
        } finally {
            // if (this.autoCommit) {
            //     await se.commit();
            // }
        }
    }

    async loadSession(ctx: RequestContext) {
        let sessionId = ctx.getMessageAdapter().read('cookie', 'sessionId');
        let session: Session | null;
        if (sessionId) {
            session = await this.sessionManager.get(sessionId);
        } else {
            session = {
                expiresAt: Date.now(),
                createdAt: Date.now(),
                data: {},
                id: '',
                userId: ''
            } as Session;
            sessionId = await this.sessionManager.create(session);
            ctx.setHeader('cookie', `sessionId=${sessionId}`);
        }
        ctx.set(Session, session);
        return session;
    }
}



/**
 * Session storage.
 */
@Abstract()
export abstract class SessionStorage {

    abstract get(key: string, maxAge: number | 'session', data: { rolling: boolean; }): Promise<string>;

    abstract set(key: string, sess: Partial<Session> & { _expire?: number; _maxAge?: number; }, maxAge: number | 'session', data: { changed: boolean; rolling: boolean; }): Promise<void>;

    abstract destroy(key: string): Promise<void>;
}
