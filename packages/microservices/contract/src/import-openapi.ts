import { ContractFieldSchema, ContractModelSchema, ContractRouteSchema, MicroserviceContract } from './types';

export interface ImportOpenApiOptions {
    /** Contract name override (default: slug of `info.title`). */
    name?: string;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

function refName(ref: string): string {
    return String(ref || '').split('/').pop() || '';
}

function slug(value: string): string {
    return String(value || 'api')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'api';
}

function numericType(value: any): 'integer' | 'number' {
    return typeof value === 'number' && Number.isInteger(value) ? 'integer' : 'number';
}

function schemaToField(schema: any, models: Record<string, ContractModelSchema>, suggestedName: string): ContractFieldSchema {
    if (!schema || typeof schema !== 'object') {
        return { type: 'string' };
    }
    if (schema.$ref) {
        return {
            type: refName(schema.$ref),
            description: schema.description
        };
    }
    if (schema.enum?.length) {
        const sample = schema.enum.find((value: any) => value !== null && value !== undefined);
        const type = typeof sample === 'number' ? numericType(sample)
            : typeof sample === 'boolean' ? 'boolean' : 'string';
        return {
            type,
            enum: [...schema.enum],
            description: schema.description,
            default: schema.default
        };
    }
    if (schema.type === 'array') {
        return {
            type: 'array',
            items: schemaToField(schema.items, models, `${suggestedName}Item`),
            description: schema.description
        };
    }
    if (schema.type === 'object' || schema.properties) {
        const properties = schema.properties ?? {};
        const required = new Set<string>(schema.required ?? []);
        const fields = Object.fromEntries(Object.entries(properties).map(([name, child]) => {
            const field = schemaToField(child, models, `${suggestedName}${name}`);
            if (required.has(name)) {
                field.required = true;
            }
            return [name, field];
        }));
        return {
            type: 'object',
            properties: fields,
            description: schema.description
        };
    }
    const type = schema.type === 'integer' ? 'integer'
        : schema.type === 'number' ? 'number'
            : schema.type === 'boolean' ? 'boolean' : 'string';
    return {
        type,
        description: schema.description,
        format: schema.format,
        default: schema.default
    };
}

function responseSchema(operation: any): any {
    const responses = operation?.responses ?? {};
    const success = Object.keys(responses)
        .filter(status => /^2\d\d$/.test(status))
        .sort()[0] ?? Object.keys(responses)[0];
    const response = success ? responses[success] : undefined;
    return response?.content?.['application/json']?.schema;
}

/**
 * Import an OpenAPI 3 document into the contract manifest format.
 *
 * Supports object schemas, `$ref`, arrays, enums, request bodies and 2xx/error
 * responses. Inline bodies are promoted to standalone models.
 */
export function importOpenApi(document: any, options: ImportOpenApiOptions = {}): MicroserviceContract {
    if (!document || typeof document !== 'object') {
        throw new Error('OpenAPI document must be an object');
    }
    const models: Record<string, ContractModelSchema> = {};
    const schemas = document.components?.schemas ?? {};
    Object.entries(schemas).forEach(([name, schema]: [string, any]) => {
        if (schema?.type === 'object' || schema?.properties) {
            const required = new Set<string>(schema.required ?? []);
            const fields = Object.fromEntries(Object.entries(schema.properties ?? {}).map(([fieldName, child]) => {
                const field = schemaToField(child, models, `${name}${fieldName}`);
                if (required.has(fieldName)) {
                    field.required = true;
                }
                return [fieldName, field];
            }));
            models[name] = {
                description: schema.description,
                fields
            };
        } else {
            models[name] = {
                description: schema?.description,
                fields: {
                    value: schemaToField(schema, models, name)
                }
            };
        }
    });

    const routes: ContractRouteSchema[] = [];
    Object.entries(document.paths ?? {}).forEach(([path, pathItem]: [string, any]) => {
        HTTP_METHODS.forEach(method => {
            const operation = pathItem?.[method];
            if (!operation) {
                return;
            }
            const requestSchema = operation.requestBody?.content?.['application/json']?.schema;
            let request: string | undefined;
            if (requestSchema?.$ref) {
                request = refName(requestSchema.$ref);
            } else if (requestSchema) {
                request = `${method.charAt(0).toUpperCase()}${method.slice(1)}${path.replace(/[^A-Za-z0-9]+/g, ' ').split(/\s+/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') || 'Request'}`;
                models[request] = {
                    fields: Object.fromEntries(Object.entries(requestSchema.properties ?? {}).map(([name, child]: [string, any]) => {
                        const field = schemaToField(child, models, `${request}${name}`);
                        if ((requestSchema.required ?? []).includes(name)) {
                            field.required = true;
                        }
                        return [name, field];
                    }))
                };
            }
            const response = responseSchema(operation);
            const responseRef = response?.$ref ? refName(response.$ref) : undefined;
            const errors = Object.keys(operation.responses ?? {})
                .filter(status => /^[45]\d\d$/.test(status))
                .map(status => Number(status));
            routes.push({
                method: method.toUpperCase(),
                path,
                operationId: operation.operationId,
                summary: operation.summary,
                description: operation.description,
                request,
                response: responseRef,
                tags: operation.tags,
                ...(errors.length ? { errors } : {})
            });
        });
    });

    return {
        name: options.name || slug(document.info?.title || 'api'),
        title: document.info?.title,
        version: document.info?.version || '1.0.0',
        description: document.info?.description,
        models,
        routes
    };
}
