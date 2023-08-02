import { tokenId } from '@tsdi/ioc';



export interface SwaggerOptions {
    [key: string]: any;
}

export interface JsonObject {
    [key: string]: any;
}

export interface SwaggerUiOptions {
    customCss?: string;
    customCssUrl?: string;
    customfavIcon?: string;
    customJs?: string;
    customJsStr?: string;
    customSiteTitle?: string;
    customRobots?: string;
    explorer?: boolean;
    isExplorer?: boolean;
    swaggerOptions?: SwaggerOptions;
    swaggerUrl?: string;
    swaggerUrls?: string[];
}


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
     * swagger-ui options.
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


    termsOfService?: string,
    contact?: {
        name: string;
        url: string;
        email: string;
    }

    license?: {
        name: string;
        url: string;
    }
}

export const SWAGGER_SETUP_OPTIONS = tokenId<SwaggerSetupOptions>('SWAGGER_SETUP_OPTIONS');

/**
 * Token of JSON object with the API schema.
 */
export const SWAGGER_DOCUMENT = tokenId<JsonObject>('SWAGGER_DOCUMENT');

// @Configuration()
// export class SwaggerJson {

//     constructor(
//         private scan: InjectorEvent,
//         @Inject(SWAGGER_SETUP_OPTIONS) private options: SwaggerSetupOptions) {
  
//     }

//     @Bean(SWAGGER_DOCUMENT)
//     build(): SwaggerOptions {
//         const json = {... this.options.options };
//         return json;
//     }

// }
