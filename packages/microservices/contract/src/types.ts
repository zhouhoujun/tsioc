/**
 * Primitive contract field type. Any other string is treated as a model name.
 */
export type ContractPrimitiveType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

export interface ContractFieldSchema {
    /**
     * Primitive type or a model name declared in `models`.
     */
    type: ContractPrimitiveType | string;
    /** Field is required in the generated DTO / OpenAPI schema. Default false. */
    required?: boolean;
    description?: string;
    /** OpenAPI `format` (for example `int64`, `date-time`, `uuid`). */
    format?: string;
    /** Enum values rendered as a TypeScript union and OpenAPI enum. */
    enum?: Array<string | number | boolean>;
    /** Item schema for `array` fields. */
    items?: ContractFieldSchema;
    /** Inline object properties for `object` fields. */
    properties?: Record<string, ContractFieldSchema>;
    default?: any;
}

export interface ContractModelSchema {
    description?: string;
    fields: Record<string, ContractFieldSchema>;
}

export interface ContractRouteSchema {
    method: string;
    path: string;
    operationId?: string;
    summary?: string;
    description?: string;
    /** Request/response model names. Omit for empty bodies. */
    request?: string;
    response?: string;
    tags?: string[];
    /** Additional error status codes documented in OpenAPI. */
    errors?: number[];
}

export interface ContractServiceSchema {
    /** gRPC service name. Default: `<Pascal(name)>Service`. */
    name?: string;
    /** gRPC/protobuf package. Default: normalized contract name. */
    package?: string;
}

export interface MicroserviceContract {
    /** Stable contract/service name (used for default OpenAPI title and proto package). */
    name: string;
    title?: string;
    version?: string;
    description?: string;
    models: Record<string, ContractModelSchema>;
    routes?: ContractRouteSchema[];
    service?: ContractServiceSchema;
}

export interface GenerateContractOptions {
    /** Emit TypeScript classes (default) or interfaces. */
    dtoStyle?: 'class' | 'interface';
    /** Add `@ApiModelProperty` decorators from `@tsdi/swagger` to generated DTOs. */
    decorators?: boolean;
    /** Override the proto package. */
    protoPackage?: string;
}

export interface GeneratedContract {
    dto: string;
    openapi: Record<string, any>;
    proto: string;
}

export interface OpenApiDocument {
    openapi: string;
    info: {
        title: string;
        version: string;
        description?: string;
    };
    paths: Record<string, Record<string, any>>;
    components: {
        schemas: Record<string, any>;
    };
}

export class ContractValidationError extends Error {
    constructor(readonly errors: string[]) {
        super(`Invalid microservice contract:\n- ${errors.join('\n- ')}`);
        this.name = 'ContractValidationError';
    }
}
