import { Abstract } from '@tsdi/ioc';
import { ServiceEndpoint, ServiceInfo, ServiceWatchCallback } from './discovery';

/**
 * Service discovery abstract interface.
 *
 * 服务发现抽象接口，提供服务注册、发现和监控能力。
 */
@Abstract()
export abstract class ServiceDiscovery {
    /**
     * register service.
     * @param info service info to register.
     */
    abstract register(info: ServiceInfo): Promise<ServiceEndpoint>;

    /**
     * deregister service.
     * @param id service id to deregister.
     */
    abstract deregister(id: string): Promise<void>;

    /**
     * discover service endpoints by name.
     * @param name service name.
     */
    abstract discover(name: string): Promise<ServiceEndpoint[]>;

    /**
     * discover one service endpoint by name.
     * @param name service name.
     */
    abstract discoverOne(name: string): Promise<ServiceEndpoint | null>;

    /**
     * get all registered services.
     */
    abstract getServices(): Promise<ServiceInfo[]>;

    /**
     * watch service changes.
     * @param name service name.
     * @param callback watch callback.
     */
    abstract watch(name: string, callback: ServiceWatchCallback): Promise<void>;

    /**
     * unwatch service changes.
     * @param name service name.
     * @param callback watch callback.
     */
    abstract unwatch(name: string, callback: ServiceWatchCallback): Promise<void>;

    /**
     * health check for service.
     * @param endpoint service endpoint.
     */
    abstract healthCheck(endpoint: ServiceEndpoint): Promise<boolean>;

    /**
     * shutdown service discovery.
     */
    abstract shutdown(): Promise<void>;
}

/**
 * Endpoint selector for load balancing.
 */
@Abstract()
export abstract class EndpointSelector {
    /**
     * select one endpoint from list.
     * @param endpoints available endpoints.
     */
    abstract select(endpoints: ServiceEndpoint[]): ServiceEndpoint | null;
}