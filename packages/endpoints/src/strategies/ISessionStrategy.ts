import { Abstract } from '@tsdi/ioc';
import { Session } from '../sessions/Session';

/**
 * Session strategy interface.
 * Defines how sessions are loaded and committed for different protocols.
 * 会话策略接口，定义不同协议的会话加载和提交方式
 */
@Abstract()
export abstract class ISessionStrategy {

    /**
     * Load session data.
     * 加载会话数据
     * @param session - Session instance
     */
    abstract load(session: Session): Promise<void>;

    /**
     * Commit session changes.
     * 提交会话更改
     * @param session - Session instance
     */
    abstract commit(session: Session): Promise<void>;

    /**
     * Validate session.
     * 验证会话
     * @param session - Session instance
     */
    abstract validate(session: Session): boolean;

    /**
     * Destroy session.
     * 销毁会话
     * @param session - Session instance
     */
    abstract destroy(session: Session): Promise<void>;
}

/**
 * Session strategy token.
 * 会话策略令牌
 */
export const SESSION_STRATEGY = 'SESSION_STRATEGY';