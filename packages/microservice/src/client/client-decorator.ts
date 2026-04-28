import { Injectable, Token, token } from '@tsdi/ioc';
import { MicroserviceClientProxy, MicroserviceClientOptions } from './client-proxy';

export interface MicroserviceClientDecoratorOptions extends MicroserviceClientOptions {
    name?: string;
}

export const MICROSERVICE_CLIENT = token<MicroserviceClientProxy>('MICROSERVICE_CLIENT');

export function MicroserviceClient(options: MicroserviceClientDecoratorOptions): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
        Reflect.defineMetadata('microservice:client_options', options, target, propertyKey);
    };
}

@Injectable()
export class MicroserviceClientRegistry {
    private clients = new Map<Token, MicroserviceClientProxy>();
    
    register(t: Token, client: MicroserviceClientProxy): void {
        this.clients.set(t, client);
    }
    
    get(t: Token): MicroserviceClientProxy | undefined {
        return this.clients.get(t);
    }
    
    has(t: Token): boolean {
        return this.clients.has(t);
    }
    
    remove(t: Token): boolean {
        return this.clients.delete(t);
    }
    
    clear(): void {
        this.clients.clear();
    }
}
