import { Inject, Injectable } from '@tsdi/ioc';
import { ServiceDiscovery, ServiceEndpoint, ServiceInfo } from '@tsdi/discovery';
import { ServiceConfig } from '../options';
import { SERVICE_REGISTRATION_OPTIONS, SERV_OPTIONS } from '../provider';
import { RegistrationOptions } from '../features/RegistrationOptions';
import { IRegistrationStrategy } from './IRegistrationStrategy';

@Injectable()
export class DiscoveryRegistrationStrategy implements IRegistrationStrategy {
    private endpoint: ServiceEndpoint | null = null;

    constructor(
        @Inject(ServiceDiscovery, { nullable: true }) private discovery: ServiceDiscovery | null,
        @Inject(SERVICE_REGISTRATION_OPTIONS, { nullable: true }) private options: RegistrationOptions | null,
        @Inject(SERV_OPTIONS, { nullable: true }) private config: ServiceConfig | null
    ) {}

    async register(): Promise<ServiceEndpoint | null> {
        if (!this.discovery) {
            return null;
        }
        if (this.options?.autoRegister === false) {
            return null;
        }
        if (this.endpoint) {
            return this.endpoint;
        }

        const info = this.buildServiceInfo();
        if (!info.name) {
            return null;
        }

        this.endpoint = await this.discovery.register(info);
        return this.endpoint;
    }

    async deregister(): Promise<void> {
        if (!this.discovery || !this.endpoint) {
            return;
        }
        if (this.options?.deregisterOnShutdown === false) {
            return;
        }
        await this.discovery.deregister(this.endpoint.id);
        this.endpoint = null;
    }

    getEndpoint(): ServiceEndpoint | null {
        return this.endpoint;
    }

    private buildServiceInfo(): ServiceInfo {
        const listenOpts = (this.config as any)?.listenOpts;
        const serviceName = this.options?.serviceName ?? this.config?.serviceName ?? this.config?.name ?? 'service';
        const protocol = this.config?.transport != null ? String(this.config.transport).toLowerCase() : undefined;
        const host = this.options?.host ?? listenOpts?.host ?? '127.0.0.1';
        const port = this.options?.port ?? listenOpts?.port;
        return {
            id: this.options?.instanceId,
            name: serviceName,
            address: port ? `${host}:${port}` : host,
            protocol,
            port,
            metadata: {
                transport: this.config?.transport,
                microservice: this.config?.microservice,
                ...(this.options?.metadata ?? {})
            }
        };
    }
}
