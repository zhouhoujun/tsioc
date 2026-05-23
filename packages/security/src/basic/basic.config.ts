import { Bean, Configuration } from '@tsdi/core';

export abstract class BasicAuthOptions {
    abstract realm?: string;
    abstract charset?: string;
}

@Configuration()
export class BasicAuthConfiguration {
    
    @Bean('security.basic')
    basicAuth: BasicAuthOptions = {
        realm: 'Protected Area',
        charset: 'UTF-8'
    };
} 