import { tokenId } from '@tsdi/ioc';
import { SwaggerConfigs } from 'swagger-ui-dist';


/**
 * OpenAPI definition
 */
export interface OpenAPIObject {
  openapi: string;
  info: InfoObject;
  servers?: ServerObject[];
  paths: Record<string, PathItemObject>;
  components?: any;
  security?: Record<string, string[]>[];
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
}

export interface TagObject {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
}

export interface InfoObject {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
  version: string;
}

export interface ContactObject {
  name?: string;
  url?: string;
  email?: string;
}

export interface LicenseObject {
  name: string;
  url?: string;
}

export interface ServerObject {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariableObject>;
}

export interface ServerVariableObject {
  enum?: string[] | boolean[] | number[];
  default: string | boolean | number;
  description?: string;
}


export interface PathItemObject {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  patch?: OperationObject;
  trace?: OperationObject;
  servers?: ServerObject[];
  parameters?: any[];
}

export interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  parameters?: any[];
  requestBody?: any;
  responses: any;
  callbacks?: any;
  deprecated?: boolean;
  security?: Record<string, string[]>[];
  servers?: ServerObject[];
}

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}


export interface SwaggerOptions extends SwaggerConfigs {

}

/**
 * Swagger ui options.
 */
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
  swaggerOptions?: Omit<SwaggerOptions, 'spec' | 'url' | 'urls'>;
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
  options?: Omit<SwaggerOptions, 'spec' | 'url' | 'urls'>;
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
  contact?: ContactObject;
  license?: LicenseObject
}

/**
 * Swagger setup options.
 */
export const SWAGGER_SETUP_OPTIONS = tokenId<SwaggerSetupOptions>('SWAGGER_SETUP_OPTIONS');

/**
 * Token of JSON object with the API schema.
 */
export const SWAGGER_DOCUMENT = tokenId<OpenAPIObject>('SWAGGER_DOCUMENT');
