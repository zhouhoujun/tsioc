/**
 * Load balance strategy type.
 * 负载均衡策略类型
 */
export enum LoadBalanceStrategy {
    /**
     * round robin strategy.
     * 轮询策略
     */
    RoundRobin,
    /**
     * random strategy.
     * 随机策略
     */
    Random,
    /**
     * weighted round robin strategy.
     * 加权轮询策略
     */
    WeightedRoundRobin,
    /**
     * least connections strategy.
     * 最少连接策略
     */
    LeastConnections
}

/**
 * Load balance options.
 * 负载均衡选项
 */
export interface LoadBalanceOptions {
    /**
     * load balance strategy.
     * 负载均衡策略
     */
    strategy?: LoadBalanceStrategy;
    /**
     * retry on same instance or not.
     * 是否在同一实例上重试
     */
    retryOnSame?: boolean;
    /**
     * service instances cache ttl in milliseconds.
     * 服务实例缓存过期时间（毫秒）
     */
    cacheTtl?: number;
}
