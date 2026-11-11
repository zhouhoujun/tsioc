import { ContractFieldSchema, ContractRouteSchema, MicroserviceContract, OpenApiDocument } from './types';
import { isPrimitiveType, operationName } from './validate';

function normalizePath(path: string): string {
    const input = String(path || '/');
    const withSlash = input.startsWith('/') ? input : `/${input}`;
    return withSlash.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function fieldSchema(field: ContractFieldSchema, contract: MicroserviceContract): Record<string, any> {
    if (!isPrimitiveType(field.type)) {
        return { $ref: `#/components/schemas/${field.type}` };
    }
    const schema: Record<string, any> = {};
    if (field.enum?.length) {
        schema.type = field.type === 'integer' || field.type === 'number' ? 'number' : 'string';
        schema.enum = [...field.enum];
    } else {
        switch (field.type) {
            case 'integer':
                schema.type = 'integer';
                break;
            case 'number':
                schema.type = 'number';
                break;
            case 'boolean':
                schema.type = 'boolean';
                break;
            case 'array':
                schema.type = 'array';
                schema.items = field.items ? fieldSchema(field.items, contract) : {};
                break;
            case 'object':
                schema.type = 'object';
                if (field.properties && Object.keys(field.properties).length) {
                    const required = Object.entries(field.properties)
                        .filter(([, child]) => child.required)
                        .map(([name]) => name);
                    schema.properties = Object.fromEntries(Object.entries(field.properties)
                        .map(([name, child]) => [name, fieldSchema(child, contract)]));
                    if (required.length) {
                        schema.required = required;
                    }
                } else {
                    schema.additionalProperties = true;
                }
                break;
            case 'string':
            default:
                schema.type = 'string';
                break;
        }
    }
    if (field.format) {
        schema.format = field.format;
    }
    if (field.description) {
        schema.description = field.description;
    }
    if (field.default !== undefined) {
        schema.default = field.default;
    }
    return schema;
}

function modelSchema(contract: MicroserviceContract, fields: Record<string, ContractFieldSchema>): Record<string, any> {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    Object.entries(fields).forEach(([name, field]) => {
        properties[name] = fieldSchema(field, contract);
        if (field.required) {
            required.push(name);
        }
    });
    const schema: Record<string, any> = {
        type: 'object',
        properties
    };
    if (required.length) {
        schema.required = required;
    }
    return schema;
}

function pathParameters(path: string): any[] {
    const names = Array.from(path.matchAll(/\{([^}]+)\}/g)).map(match => match[1]);
    return names.map(name => ({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' }
    }));
}

function operation(contract: MicroserviceContract, route: ContractRouteSchema, index: number): Record<string, any> {
    const path = normalizePath(route.path);
    const responseModel = route.response;
    const responses: Record<string, any> = responseModel
        ? {
            200: {
                description: 'Successful response',
                content: {
                    'application/json': {
                        schema: { $ref: `#/components/schemas/${responseModel}` }
                    }
                }
            }
        }
        : { 204: { description: 'No content' } };
    (route.errors ?? []).forEach(status => {
        responses[String(status)] = { description: `Error response (${status})` };
    });
    const result: Record<string, any> = {
        operationId: operationName(route, index),
        summary: route.summary || operationName(route, index),
        responses
    };
    if (route.description) {
        result.description = route.description;
    }
    if (route.tags?.length) {
        result.tags = [...route.tags];
    }
    const parameters = pathParameters(path);
    if (parameters.length) {
        result.parameters = parameters;
    }
    if (route.request) {
        result.requestBody = {
            required: true,
            content: {
                'application/json': {
                    schema: { $ref: `#/components/schemas/${route.request}` }
                }
            }
        };
    }
    return result;
}

/**
 * Generate an OpenAPI 3 document for a contract.
 */
export function generateOpenApi(contract: MicroserviceContract): OpenApiDocument {
    const paths: Record<string, Record<string, any>> = {};
    (contract.routes ?? []).forEach((route, index) => {
        const path = normalizePath(route.path);
        const method = String(route.method || 'get').toLowerCase();
        paths[path] ??= {};
        paths[path][method] = operation(contract, route, index);
    });
    return {
        openapi: '3.0.2',
        info: {
            title: contract.title || contract.name,
            version: contract.version || '1.0.0',
            ...(contract.description ? { description: contract.description } : {})
        },
        paths,
        components: {
            schemas: Object.fromEntries(Object.entries(contract.models ?? {})
                .map(([name, model]) => [name, modelSchema(contract, model.fields ?? {})]))
        }
    };
}
