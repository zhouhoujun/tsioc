import { ContractFieldSchema, ContractRouteSchema, MicroserviceContract } from './types';
import { isPrimitiveType, operationName, pascalCase } from './validate';

const SCALAR_TYPES: Record<string, string> = {
    string: 'string',
    number: 'double',
    integer: 'int64',
    boolean: 'bool'
};

function snakeCase(value: string): string {
    return String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[^A-Za-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() || 'field';
}

function normalizePackage(value: string): string {
    return String(value || 'contract')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map(part => part.toLowerCase())
        .join('.') || 'contract';
}

function enumScalar(field: ContractFieldSchema): string {
    const values = field.enum ?? [];
    if (values.every(value => typeof value === 'number' && Number.isInteger(value))) {
        return 'int64';
    }
    if (values.every(value => typeof value === 'number')) {
        return 'double';
    }
    return 'string';
}

interface ProtoContext {
    contract: MicroserviceContract;
    messages: Map<string, string[]>;
    usesEmpty: boolean;
}

function scalarType(field: ContractFieldSchema): string {
    if (field.enum?.length) {
        return enumScalar(field);
    }
    return SCALAR_TYPES[field.type] ?? 'string';
}

function objectMessage(ctx: ProtoContext, name: string, field: ContractFieldSchema): string {
    const messageName = pascalCase(name);
    if (ctx.messages.has(messageName)) {
        return messageName;
    }
    const lines: string[] = [`message ${messageName} {`];
    const properties = field.properties ?? {};
    const entries = Object.entries(properties);
    if (!entries.length) {
        lines.push('    string value = 1;');
        lines.push('}');
        ctx.messages.set(messageName, lines);
        return messageName;
    }
    entries.forEach(([childName, child], index) => {
        const comment = child.description ? ` // ${child.description.replace(/\r?\n/g, ' ')}` : '';
        lines.push(`    ${fieldDeclaration(ctx, messageName, childName, child, index + 1)}${comment}`);
    });
    lines.push('}');
    ctx.messages.set(messageName, lines);
    return messageName;
}

function fieldDeclaration(ctx: ProtoContext, owner: string, fieldName: string, field: ContractFieldSchema, index: number): string {
    let type: string;
    let repeated = false;
    if (field.enum?.length) {
        type = enumScalar(field);
    } else if (field.type === 'array') {
        repeated = true;
        const item = field.items;
        if (!item) {
            type = 'string';
        } else if (item.type === 'object') {
            type = objectMessage(ctx, `${owner}${pascalCase(fieldName)}Item`, item);
        } else if (isPrimitiveType(item.type)) {
            type = scalarType(item);
        } else {
            type = item.type;
        }
    } else if (field.type === 'object') {
        type = objectMessage(ctx, `${owner}${pascalCase(fieldName)}`, field);
    } else if (isPrimitiveType(field.type)) {
        type = scalarType(field);
    } else {
        type = field.type;
    }
    const label = repeated ? 'repeated ' : (field.required ? '' : 'optional ');
    return `${label}${type} ${snakeCase(fieldName)} = ${index};`;
}

function modelMessages(ctx: ProtoContext, contract: MicroserviceContract): void {
    Object.entries(contract.models ?? {}).forEach(([modelName, model]) => {
        const lines: string[] = [`message ${modelName} {`];
        Object.entries(model.fields ?? {}).forEach(([fieldName, field], index) => {
            const comment = field.description || (field.enum?.length ? `enum: ${field.enum.join(', ')}` : '');
            lines.push(`    ${fieldDeclaration(ctx, modelName, fieldName, field, index + 1)}${comment ? ` // ${comment.replace(/\r?\n/g, ' ')}` : ''}`);
        });
        lines.push('}');
        ctx.messages.set(modelName, lines);
    });
}

function routeMethod(contract: MicroserviceContract, route: ContractRouteSchema, index: number): string[] {
    const request = route.request || 'Empty';
    const response = route.response || 'Empty';
    const comment = `// HTTP ${String(route.method || 'GET').toUpperCase()} ${route.path}`;
    return [`    ${comment}`, `    rpc ${operationName(route, index)} (${request}) returns (${response});`];
}

/**
 * Generate a proto3 contract. Routes become unary RPCs; HTTP method/path are
 * preserved as comments so the file stays dependency-free.
 */
export function generateProto(contract: MicroserviceContract, protoPackage?: string): string {
    const ctx: ProtoContext = {
        contract,
        messages: new Map(),
        usesEmpty: false
    };
    modelMessages(ctx, contract);

    const routes = contract.routes ?? [];
    routes.forEach(route => {
        if (!route.request || !route.response) {
            ctx.usesEmpty = true;
        }
    });
    if (ctx.usesEmpty) {
        ctx.messages.set('Empty', ['message Empty {}']);
    }

    const lines = [
        'syntax = "proto3";',
        '',
        `package ${normalizePackage(protoPackage || contract.service?.package || contract.name)};`,
        ''
    ];
    for (const message of ctx.messages.values()) {
        lines.push(...message, '');
    }
    if (routes.length) {
        const serviceName = contract.service?.name || `${pascalCase(contract.name)}Service`;
        lines.push(`service ${serviceName} {`);
        routes.forEach((route, index) => {
            lines.push(...routeMethod(contract, route, index));
        });
        lines.push('}');
        lines.push('');
    }
    return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}
