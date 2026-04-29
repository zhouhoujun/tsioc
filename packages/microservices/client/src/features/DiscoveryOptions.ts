/**
 * Service discovery options.
 * 服务发现选项
 */
export interface DiscoveryOptions {
    /**
     * discovery server host.
     * 发现服务器地址
     */
    host?: string;
    /**
     * discovery server port.
     * 发现服务器端口
     */
    port?: number;
    /**
     * service name to discover.
     * 要发现的服务名称
     */
    serviceName?: string;
    /**
     * prefer ip address or not.
     * 是否优先使用IP地址
     */
    preferIpAddress?: boolean;
    /**
     * heartbeat interval in milliseconds.
     * 心跳间隔（毫秒）
     */
    heartbeatInterval?: number;
}
