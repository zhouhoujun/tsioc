import { ContractFieldSchema, ContractModelSchema, ContractRouteSchema, MicroserviceContract } from './types';
import { camelCase } from './validate';

export interface ImportProtoOptions {
    /** Contract name override. */
    name?: string;
}

interface ProtoField {
    label?: string;
    type: string;
    name: string;
    comment?: string;
}

interface ProtoMessage {
    name: string;
    fields: ProtoField[];
}

interface ProtoRpc {
    name: string;
    request: string;
    response: string;
    comment?: string;
}

function kebabCase(value: string): string {
    return String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'api';
}

function scalarType(type: string): ContractFieldSchema['type'] | undefined {
    switch (type) {
        case 'string':
        case 'bytes':
            return 'string';
        case 'bool':
        case 'boolean':
            return 'boolean';
        case 'double':
        case 'float':
            return 'number';
        case 'int32':
        case 'int64':
        case 'uint32':
        case 'uint64':
        case 'sint32':
        case 'sint64':
        case 'fixed32':
        case 'fixed64':
        case 'sfixed32':
        case 'sfixed64':
            return 'integer';
        default:
            return undefined;
    }
}

function enumValuesFromComment(comment?: string): Array<string | number | boolean> | undefined {
    const match = String(comment || '').match(/enum:\s*(.+)$/i);
    if (!match) {
        return undefined;
    }
    return match[1]
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
        .map(value => value === 'true' ? true : value === 'false' ? false : (/^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value));
}

function fieldSchema(
    field: ProtoField,
    enums: Map<string, string[]>
): ContractFieldSchema {
    const enumComment = enumValuesFromComment(field.comment);
    let schema: ContractFieldSchema;
    const scalar = scalarType(field.type);
    if (enums.has(field.type)) {
        schema = {
            type: 'string',
            enum: enumComment ?? enums.get(field.type)!
        };
    } else if (scalar) {
        schema = { type: scalar };
        if (enumComment) {
            schema.enum = enumComment;
        }
    } else {
        schema = { type: field.type };
    }
    if (field.label === 'repeated') {
        return {
            type: 'array',
            items: schema,
            required: false
        };
    }
    schema.required = field.label !== 'optional';
    const description = String(field.comment || '').replace(/enum:\s*.+$/i, '').trim();
    if (description) {
        schema.description = description;
    }
    return schema;
}

function parseRoute(rpc: ProtoRpc, contractName: string): ContractRouteSchema {
    const http = String(rpc.comment || '').match(/HTTP\s+([A-Za-z]+)\s+(\S+)/i);
    const method = http ? http[1].toUpperCase() : 'POST';
    const path = http ? http[2] : `/${kebabCase(rpc.name)}`;
    return {
        method,
        path,
        operationId: rpc.name,
        summary: rpc.name,
        request: rpc.request === 'Empty' ? undefined : rpc.request,
        response: rpc.response === 'Empty' ? undefined : rpc.response,
        tags: [contractName]
    };
}

/**
 * Import a proto3 contract subset into the contract manifest format.
 *
 * Supports messages, scalar/repeated/optional fields, enums referenced by
 * fields, and unary services. HTTP method/path comments emitted by
 * `generateProto` are restored as routes.
 */
export function importProto(source: string, options: ImportProtoOptions = {}): MicroserviceContract {
    const withoutBlockComments = String(source || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const messages = new Map<string, ProtoMessage>();
    const enums = new Map<string, string[]>();
    const rpcs: ProtoRpc[] = [];
    const stack: Array<{ kind: 'message' | 'service' | 'enum'; name: string }> = [];
    let serviceName = '';
    let protoPackage = '';
    let lastComment = '';
    let currentMessage: ProtoMessage | undefined;

    for (const rawLine of withoutBlockComments.split(/\r?\n/)) {
        const commentIndex = rawLine.indexOf('//');
        const comment = commentIndex >= 0 ? rawLine.slice(commentIndex + 2).trim() : undefined;
        const code = (commentIndex >= 0 ? rawLine.slice(0, commentIndex) : rawLine).trim();
        if (!code) {
            if (comment) {
                lastComment = comment;
            }
            continue;
        }
        const packageMatch = code.match(/^package\s+([\w.]+)\s*;/);
        if (packageMatch) {
            protoPackage = packageMatch[1];
            continue;
        }
        const emptyMessage = code.match(/^message\s+(\w+)\s*\{\s*\}\s*$/);
        if (emptyMessage) {
            messages.set(emptyMessage[1], { name: emptyMessage[1], fields: [] });
            continue;
        }
        const messageMatch = code.match(/^message\s+(\w+)\s*\{/);
        if (messageMatch) {
            currentMessage = { name: messageMatch[1], fields: [] };
            messages.set(currentMessage.name, currentMessage);
            stack.push({ kind: 'message', name: currentMessage.name });
            lastComment = '';
            continue;
        }
        const enumMatch = code.match(/^enum\s+(\w+)\s*\{/);
        if (enumMatch) {
            enums.set(enumMatch[1], []);
            stack.push({ kind: 'enum', name: enumMatch[1] });
            continue;
        }
        const serviceMatch = code.match(/^service\s+(\w+)\s*\{/);
        if (serviceMatch) {
            serviceName = serviceMatch[1];
            stack.push({ kind: 'service', name: serviceName });
            continue;
        }
        if (code === '}' || code.startsWith('}')) {
            stack.pop();
            currentMessage = undefined;
            lastComment = '';
            continue;
        }
        const top = stack[stack.length - 1];
        if (top?.kind === 'enum') {
            const value = code.match(/^(\w+)\s*=\s*-?\d+\s*;/);
            if (value && !/_(UNSPECIFIED|DEFAULT)$/i.test(value[1])) {
                enums.get(top.name)!.push(value[1]);
            }
            continue;
        }
        if (top?.kind === 'service') {
            const rpc = code.match(/^rpc\s+(\w+)\s*\(\s*([\w.]+)\s*\)\s*returns\s*\(\s*([\w.]+)\s*\)\s*;/);
            if (rpc) {
                rpcs.push({
                    name: rpc[1],
                    request: rpc[2],
                    response: rpc[3],
                    comment: comment || lastComment
                });
                lastComment = '';
            }
            continue;
        }
        if (top?.kind === 'message') {
            const field = code.match(/^(optional\s+|required\s+|repeated\s+)?([\w.]+)\s+(\w+)\s*=\s*\d+\s*;/);
            if (field && currentMessage) {
                currentMessage.fields.push({
                    label: field[1]?.trim(),
                    type: field[2],
                    name: field[3],
                    comment: comment || lastComment
                });
                lastComment = '';
            }
        }
    }

    const models: Record<string, ContractModelSchema> = {};
    messages.forEach(message => {
        if (message.name === 'Empty') {
            return;
        }
        models[message.name] = {
            fields: Object.fromEntries(message.fields.map(field => [
                camelCase(field.name),
                fieldSchema(field, enums)
            ]))
        };
    });

    const serviceBase = serviceName ? serviceName.replace(/Service$/, '') : '';
    const contractName = options.name
        || (serviceBase ? kebabCase(serviceBase) : (protoPackage.split('.').pop() || 'api'));
    return {
        name: contractName,
        title: serviceName || contractName,
        version: '1.0.0',
        ...(protoPackage ? { service: { name: serviceName || undefined, package: protoPackage } } : {}),
        models,
        routes: rpcs.map(rpc => parseRoute(rpc, contractName))
    };
}
