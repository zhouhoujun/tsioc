import { Inject, tokenId } from '@tsdi/ioc';
import { Bean, Configuration } from '@tsdi/core';
import { SwaggerOptions, JsonObject, SwaggerUiOptions } from 'swagger-ui-express';



/**
 * Swagger setup options
 */
export interface SwaggerSetupOptions {
    /**
     * custom title for a page.
     */
    title: string;
    /**
     * descripton.
     */
    description?: string;
    /**
     * api version.
     */
    version?: string;
    /**
     * document api prefix.
     */
    prefix?: string;
    /**
     * swagger-ui-express options.
     */
    opts?: SwaggerUiOptions;
    /**
     * custom Swagger options.
     */
    options?: SwaggerOptions;
    /**
     * string with a custom CSS to embed into the page.
     */
    customCss?: string;
    /**
     * link to a custom favicon.
     */
    customfavIcon?: string;
    /**
     * URL of the Swagger API schema, can be specified instead of the swaggerDoc.
     */
    swaggerUrl?: string;
    /**
     * custom title for a page.
     */
    customSiteTitle?: string;
}

export const SWAGGER_SETUP_OPTIONS = tokenId<SwaggerSetupOptions>('SWAGGER_SETUP_OPTIONS');

/**
 * Token of JSON object with the API schema.
 */
export const SWAGGER_DOCUMENT = tokenId<JsonObject>('SWAGGER_DOCUMENT');

@Configuration()
export class SwaggerJson {

    constructor(@Inject(SWAGGER_SETUP_OPTIONS) private options: SwaggerSetupOptions) {

    }

    @Bean(SWAGGER_DOCUMENT)
    build(): any {
        
    }

}
