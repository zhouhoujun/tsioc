import { Injectable } from '@tsdi/ioc';
import { IClientTransportStrategy, CLIENT_TRANSPORT_STRATEGY, RequestInitOpts } from '@tsdi/common/client';
import { Pattern } from '@tsdi/common';
import { TcpRequest } from '../request';
import { TcpClientOptions } from '../options';

/**
 * Tcp client transport strategy.
 * TCP 客户端传输策略。实现 IClientTransportStrategy 接口的最小实现，供测试使用。
 * This class is a minimal TCP transport strategy used by tests and as a pilot
 * implementation for other protocols following the strategy pattern.
 */
@Injectable()
export class TcpTransportStrategy
    implements IClientTransportStrategy<TcpRequest<any>, any, TcpClientOptions> {

    private _connected = false;

    /** 连接传输层
     * Connect to the transport. 连接传输层
     */
    connect(): Promise<void> | import('rxjs').Observable<void> {
        this._connected = true;
        return Promise.resolve();
    }

    /**
     * 根据模式和选项创建请求
     * Create request from pattern and options.
     */
    createRequest(pattern: Pattern, options: RequestInitOpts<any, any>): TcpRequest<any> {
        const method = (options as any).method ?? undefined;
        const url = typeof pattern === 'string' ? pattern : '/';
        // Minimal TCP request construction for tests
        return new TcpRequest<any>(url as any, null as any, options as any, method as any);
    }

    /**
     * Initialize request context with transport-specific data.
     * 初始化请求上下文
     */
    initContext(context: any, request: TcpRequest<any>): void {
        (request as any).initialized = true;
        (context as any).TcpTransportStrategy = this;
    }

    /** 处理关闭/清理 */
    onShutdown(): Promise<void> {
        this._connected = false;
        return Promise.resolve();
    }

    isConnected(): boolean {
        return this._connected;
    }

    getConfig(): TcpClientOptions {
        // Return a minimal config. Tests rely on types, not values here.
        return {} as TcpClientOptions;
    }
}

/** Token export for DI, kept for compatibility with other modules. */
export const TcpTransportStrategyToken = CLIENT_TRANSPORT_STRATEGY;
