import { Injectable } from '@tsdi/ioc';
import { AbstractRequestContext } from '@tsdi/common';
import { ISessionStrategy, SESSION_STRATEGY } from '@tsdi/endpoints';
import { Session } from '@tsdi/endpoints/sessions/Session';

/**
 * HTTP session strategy.
 * HTTP 会话策略，实现 ISessionStrategy 接口
 * Handles HTTP session management.
 */
@Injectable()
export class HttpSessionStrategy implements ISessionStrategy {

    /**
     * Get session from context.
     * 从上下文获取会话
     */
    getSession(context: AbstractRequestContext): Session | null {
        const request = context.request as any;
        // HTTP sessions are typically handled by express-session or similar middleware
        // Check for session property on request
        if (request.session) {
            return request.session as Session;
        }
        return null;
    }

    /**
     * Set session in context.
     * 在上下文中设置会话
     */
    setSession(context: AbstractRequestContext, session: Session): void {
        const request = context.request as any;
        request.session = session;
    }

    /**
     * Create new session.
     * 创建新会话
     */
    createSession(context: AbstractRequestContext): Session {
        const request = context.request as any;
        // Create a minimal session object
        const session: Session = {
            id: this.generateSessionId(),
            data: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        request.session = session;
        return session;
    }

    /**
     * Destroy session.
     * 销毁会话
     */
    destroySession(context: AbstractRequestContext): void {
        const request = context.request as any;
        if (request.session) {
            request.session = null;
        }
    }

    /**
     * Generate unique session ID.
     * 生成唯一会话ID
     */
    protected generateSessionId(): string {
        return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}

export const HttpSessionStrategyToken = SESSION_STRATEGY;