import { Type } from '@tsdi/ioc';

/**
 * Service registration options, like Spring Cloud Eureka/Consul.
 * 服务注册选项，类似 Spring Cloud Eureka/Consul
 */
export interface RegistrationOptions {
    /**
     * service name to register.
     * 注册的服务名称
     */
    serviceName?: string;
    /**
     * service instance id.
     * 服务实例ID
     */
    instanceId?: string;
    /**
     * service host.
     * 服务主机地址
     */
    host?: string;
    /**
     * service port.
     * 服务端口
     */
    port?: number;
    /**
     * metadata key-value pairs.
     * 元数据键值对
     */
    metadata?: Record<string, string>;
    /**
     * prefer ip address or not.
     * 是否优先使用IP地址
     */
    preferIpAddress?: boolean;
    /**
     * auto register on start or not. default true.
     * 启动时是否自动注册，默认 true
     */
    autoRegister?: boolean;
    /**
     * deregister on shutdown or not. default true.
     * 关闭时是否注销，默认 true
     */
    deregisterOnShutdown?: boolean;
}
