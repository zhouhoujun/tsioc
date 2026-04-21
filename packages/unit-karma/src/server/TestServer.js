"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestServer = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
/**
 * Test server for serving browser test files.
 * 用于提供浏览器测试文件的测试服务器
 */
let TestServer = class TestServer {
    constructor() {
        this.server = null;
        this.wsServer = null;
        this.clients = new Set();
        this.messageHandlers = new Map();
        this.options = {};
    }
    /**
     * Start the test server.
     * 启动测试服务器
     */
    async start(options) {
        this.options = { port: 9876, host: 'localhost', ...options };
        return new Promise((resolve, reject) => {
            try {
                if (this.options.https && this.options.sslKey && this.options.sslCert) {
                    const httpsOptions = {
                        key: fs.readFileSync(this.options.sslKey),
                        cert: fs.readFileSync(this.options.sslCert)
                    };
                    this.server = https.createServer(httpsOptions, this.handleRequest.bind(this));
                }
                else {
                    this.server = http.createServer(this.handleRequest.bind(this));
                }
                if (this.options.websocket) {
                    this.wsServer = new WebSocket.Server({ server: this.server });
                    this.setupWebSocket();
                }
                this.server.listen(this.options.port, this.options.host, () => {
                    const protocol = this.options.https ? 'https' : 'http';
                    const url = `${protocol}://${this.options.host}:${this.options.port}`;
                    resolve(url);
                });
                this.server.on('error', reject);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Stop the test server.
     * 停止测试服务器
     */
    async stop() {
        return new Promise((resolve, reject) => {
            if (this.wsServer) {
                this.clients.forEach(client => client.close());
                this.clients.clear();
                this.wsServer.close(err => {
                    if (err)
                        reject(err);
                });
            }
            if (this.server) {
                this.server.close(err => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Get server URL.
     * 获取服务器 URL
     */
    getUrl() {
        const protocol = this.options.https ? 'https' : 'http';
        return `${protocol}://${this.options.host}:${this.options.port}`;
    }
    /**
     * Broadcast message to all WebSocket clients.
     * 向所有 WebSocket 客户端广播消息
     */
    broadcast(type, payload) {
        const message = {
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
    send(client, type, payload) {
        const message = {
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
    onMessage(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type).add(handler);
    }
    /**
     * Remove message handler.
     * 移除消息处理器
     */
    offMessage(type, handler) {
        this.messageHandlers.get(type)?.delete(handler);
    }
    /**
     * Handle HTTP requests.
     * 处理 HTTP 请求
     */
    handleRequest(req, res) {
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
            this.options.routes.get(url)(req, res);
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
    setupWebSocket() {
        if (!this.wsServer)
            return;
        this.wsServer.on('connection', (ws) => {
            this.clients.add(ws);
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(ws, message);
                }
                catch (error) {
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
    handleMessage(ws, message) {
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(message.payload);
                }
                catch (error) {
                    console.error('Error in message handler:', error);
                }
            });
        }
    }
    /**
     * Get content type for file extension.
     * 根据文件扩展名获取内容类型
     */
    getContentType(ext) {
        const types = {
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
    isRunning() {
        return this.server !== null && this.server.listening;
    }
    /**
     * Get connected WebSocket clients count.
     * 获取已连接的 WebSocket 客户端数量
     */
    getClientCount() {
        return this.clients.size;
    }
};
exports.TestServer = TestServer;
exports.TestServer = TestServer = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], TestServer);
//# sourceMappingURL=TestServer.js.map