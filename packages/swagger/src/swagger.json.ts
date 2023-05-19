import { Bean, Configuration } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { SwaggerConfigs, SwaggerUIBundle } from 'swagger-ui-dist';


export const SWAGGER_CONFIGS = tokenId<SwaggerConfigs>('SWAGGER_CONFIGS');

export interface Options {
    title: string;
    description?: string;
    version?: string;
    /**
     * document api prefix.
     */
    prefix?: string;
}


@Configuration()
export class SwaggerJson {

    constructor() {

    }

    @Bean(SWAGGER_CONFIGS)
    build(): any {

    }

}
