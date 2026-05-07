import { ContextToken } from '@tsdi/ioc';

/**
 * WebSocket socket token for storing the socket in context.
 * WebSocket 套接字在上下文中的令牌
 */
export const SOCKET = new ContextToken<any>(() => null);
