import * as http from 'http';
import * as WebSocket from 'ws';
/**
 * Test server options.
 * 测试服务器选项
 */
export interface TestServerOptions {
    /**
     * Server port.
     * 服务器端口
     */
    port?: number;
    /**
     * Server host.
     * 服务器主机
     */
    host?: string;
    /**
     * Base directory for serving files.
     * 文件服务根目录
     */
    baseDir?: string;
    /**
     * Enable HTTPS.
     * 启用 HTTPS
     */
    https?: boolean;
    /**
     * SSL key path (for HTTPS).
     * SSL 密钥路径（用于 HTTPS）
     */
    sslKey?: string;
    /**
     * SSL cert path (for HTTPS).
     * SSL 证书路径（用于 HTTPS）
     */
    sslCert?: string;
    /**
     * Enable WebSocket for real-time communication.
     * 启用 WebSocket 进行实时通信
     */
    websocket?: boolean;
    /**
     * CORS enabled.
     * 启用 CORS
     */
    cors?: boolean;
    /**
     * Custom routes.
     * 自定义路由
     */
    routes?: Map<string, (req: http.IncomingMessage, res: http.ServerResponse) => void>;
}
/**
 * WebSocket message types.
 * WebSocket 消息类型
 */
export type TestServerMessageType = 'test:start' | 'test:result' | 'test:complete' | 'coverage:data' | 'error' | 'log';
/**
 * WebSocket message.
 * WebSocket 消息
 */
export interface TestServerMessage {
    type: TestServerMessageType;
    payload: any;
    timestamp: number;
}
/**
 * Test server for serving browser test files.
 * 用于提供浏览器测试文件的测试服务器
 */
export declare class TestServer {
    private server;
    private wsServer;
    private clients;
    private messageHandlers;
    private options;
    /**
     * Start the test server.
     * 启动测试服务器
     */
    start(options?: TestServerOptions): Promise<string>;
    /**
     * Stop the test server.
     * 停止测试服务器
     */
    stop(): Promise<void>;
    /**
     * Get server URL.
     * 获取服务器 URL
     */
    getUrl(): string;
    /**
     * Broadcast message to all WebSocket clients.
     * 向所有 WebSocket 客户端广播消息
     */
    broadcast(type: TestServerMessageType, payload: any): void;
    /**
     * Send message to specific client.
     * 向特定客户端发送消息
     */
    send(client: WebSocket, type: TestServerMessageType, payload: any): void;
    /**
     * Register message handler.
     * 注册消息处理器
     */
    onMessage(type: TestServerMessageType, handler: (payload: any) => void): void;
    /**
     * Remove message handler.
     * 移除消息处理器
     */
    offMessage(type: TestServerMessageType, handler: (payload: any) => void): void;
    /**
     * Handle HTTP requests.
     * 处理 HTTP 请求
     */
    private handleRequest;
    /**
     * Setup WebSocket server.
     * 设置 WebSocket 服务器
     */
    private setupWebSocket;
    /**
     * Handle WebSocket message.
     * 处理 WebSocket 消息
     */
    private handleMessage;
    /**
     * Get content type for file extension.
     * 根据文件扩展名获取内容类型
     */
    private getContentType;
    /**
     * Check if server is running.
     * 检查服务器是否正在运行
     */
    isRunning(): boolean;
    /**
     * Get connected WebSocket clients count.
     * 获取已连接的 WebSocket 客户端数量
     */
    getClientCount(): number;
}
