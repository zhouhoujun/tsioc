import { Injectable } from '@tsdi/ioc';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
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
@Injectable()
export class TestServer {
    private server: http.Server | https.Server | null = null;
    private wsServer: WebSocket.Server | null = null;
    private clients: Set<WebSocket> = new Set();
    private messageHandlers: Map<TestServerMessageType, Set<(payload: any) => void>> = new Map();
    private options: TestServerOptions = {};

    /**
     * Start the test server.
     * 启动测试服务器
     */
    async start(options?: TestServerOptions): Promise<string> {
        this.options = { port: 9876, host: 'localhost', ...options };

        return new Promise((resolve, reject) => {
            try {
                if (this.options.https && this.options.sslKey && this.options.sslCert) {
                    const httpsOptions = {
                        key: fs.readFileSync(this.options.sslKey),
                        cert: fs.readFileSync(this.options.sslCert)
                    };
                    this.server = https.createServer(httpsOptions, this.handleRequest.bind(this));
                } else {
                    this.server = http.createServer(this.handleRequest.bind(this));
                }

                if (this.options.websocket) {
                    this.wsServer = new WebSocket.Server({ server: this.server });
                    this.setupWebSocket();
                }

                this.server.listen(this.options.port!, this.options.host!, () => {
                    const protocol = this.options.https ? 'https' : 'http';
                    const url = `${protocol}://${this.options.host}:${this.options.port}`;
                    resolve(url);
                });

                this.server.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Stop the test server.
     * 停止测试服务器
     */
    async stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.wsServer) {
                this.clients.forEach(client => client.close());
                this.clients.clear();
                this.wsServer.close(err => {
                    if (err) reject(err);
                });
            }

            if (this.server) {
                this.server.close(err => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Get server URL.
     * 获取服务器 URL
     */
    getUrl(): string {
        const protocol = this.options.https ? 'https' : 'http';
        return `${protocol}://${this.options.host}:${this.options.port}`;
    }

    /**
     * Broadcast message to all WebSocket clients.
     * 向所有 WebSocket 客户端广播消息
     */
    broadcast(type: TestServerMessageType, payload: any): void {
        const message: TestServerMessage = {
            type,
            payload,
            timestamp: Date.now()
        };

        const data = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    /**
     * Send message to specific client.
     * 向特定客户端发送消息
     */
    send(client: WebSocket, type: TestServerMessageType, payload: any): void {
        const message: TestServerMessage = {
            type,
            payload,
            timestamp: Date.now()
        };

        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    }

    /**
     * Register message handler.
     * 注册消息处理器
     */
    onMessage(type: TestServerMessageType, handler: (payload: any) => void): void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type)!.add(handler);
    }

    /**
     * Remove message handler.
     * 移除消息处理器
     */
    offMessage(type: TestServerMessageType, handler: (payload: any) => void): void {
        this.messageHandlers.get(type)?.delete(handler);
    }

    /**
     * Handle HTTP requests.
     * 处理 HTTP 请求
     */
    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const url = req.url || '/';
        const baseDir = this.options.baseDir || process.cwd();

        if (this.options.cors) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        }

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (this.options.routes?.has(url)) {
            this.options.routes.get(url)!(req, res);
            return;
        }

        let filePath = path.join(baseDir, url === '/' ? 'index.html' : url);

        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        const ext = path.extname(filePath);
        const contentType = this.getContentType(ext);

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Internal Server Error');
                return;
            }

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    }

    /**
     * Setup WebSocket server.
     * 设置 WebSocket 服务器
     */
    private setupWebSocket(): void {
        if (!this.wsServer) return;

        this.wsServer.on('connection', (ws: WebSocket) => {
            this.clients.add(ws);

            ws.on('message', (data: string) => {
                try {
                    const message: TestServerMessage = JSON.parse(data.toString());
                    this.handleMessage(ws, message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
    }

    /**
     * Handle WebSocket message.
     * 处理 WebSocket 消息
     */
    private handleMessage(ws: WebSocket, message: TestServerMessage): void {
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(message.payload);
                } catch (error) {
                    console.error('Error in message handler:', error);
                }
            });
        }
    }

    /**
     * Get content type for file extension.
     * 根据文件扩展名获取内容类型
     */
    private getContentType(ext: string): string {
        const types: Record<string, string> = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.ts': 'application/typescript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject'
        };
        return types[ext] || 'application/octet-stream';
    }

    /**
     * Check if server is running.
     * 检查服务器是否正在运行
     */
    isRunning(): boolean {
        return this.server !== null && this.server.listening;
    }

    /**
     * Get connected WebSocket clients count.
     * 获取已连接的 WebSocket 客户端数量
     */
    getClientCount(): number {
        return this.clients.size;
    }
}