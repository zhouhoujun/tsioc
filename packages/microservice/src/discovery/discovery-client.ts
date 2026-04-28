import { Abstract, Injectable } from '@tsdi/ioc';

export interface ServiceInstance {
    serviceId: string;
    host: string;
    port: number;
    uri?: string;
    scheme?: string;
    metadata?: Record<string, string>;
    secure?: boolean;
}

@Abstract()
export abstract class DiscoveryClient {
    abstract description(): string;
    abstract getServices(): Promise<string[]>;
    abstract getInstances(serviceId: string): Promise<ServiceInstance[]>;
    abstract getInstance(serviceId: string): Promise<ServiceInstance | undefined>;
    abstract getLocalInstance(): Promise<ServiceInstance | undefined>;
}

@Injectable()
export class NoopDiscoveryClient extends DiscoveryClient {
    description(): string {
        return 'No-op discovery client (no service discovery configured)';
    }
    
    async getServices(): Promise<string[]> {
        return [];
    }
    
    async getInstances(serviceId: string): Promise<ServiceInstance[]> {
        return [];
    }
    
    async getInstance(serviceId: string): Promise<ServiceInstance | undefined> {
        return undefined;
    }
    
    async getLocalInstance(): Promise<ServiceInstance | undefined> {
        return undefined;
    }
}

export interface DiscoveryClientOptions {
    enabled?: boolean;
    registryUrl?: string;
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
}

export function createServiceInstance(
    serviceId: string,
    host: string,
    port: number,
    options?: {
        scheme?: string;
        metadata?: Record<string, string>;
        secure?: boolean;
    }
): ServiceInstance {
    const scheme = options?.scheme ?? 'http';
    return {
        serviceId,
        host,
        port,
        uri: `${scheme}://${host}:${port}`,
        scheme,
        metadata: options?.metadata ?? {},
        secure: options?.secure ?? scheme === 'https'
    };
}