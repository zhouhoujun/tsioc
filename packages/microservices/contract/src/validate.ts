import { ContractFieldSchema, ContractPrimitiveType, ContractRouteSchema, MicroserviceContract } from './types';

export const PRIMITIVE_TYPES: ContractPrimitiveType[] = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

export function isPrimitiveType(type: string): type is ContractPrimitiveType {
    return PRIMITIVE_TYPES.includes(type as ContractPrimitiveType);
}

export function pascalCase(value: string): string {
    return String(value || '')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('') || 'Value';
}

export function camelCase(value: string): string {
    const pascal = pascalCase(value);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function operationName(route: ContractRouteSchema, index: number): string {
    if (route.operationId) {
        return pascalCase(route.operationId);
    }
    const path = String(route.path || '')
        .replace(/[{}:]/g, ' ')
        .split('/')
        .filter(Boolean)
        .map(part => pascalCase(part))
        .join('');
    return `${pascalCase(route.method || 'operation')}${path || `Operation${index + 1}`}`;
}

export function validateContract(contract: MicroserviceContract): string[] {
    const errors: string[] = [];
    if (!contract || typeof contract !== 'object') {
        return ['contract must be an object'];
    }
    if (!contract.name) {
        errors.push('contract name is required');
    }
    if (!contract.models || typeof contract.models !== 'object') {
        errors.push('contract models map is required');
    }
    const models = contract.models ?? {};
    const names = new Set(Object.keys(models));

    const validateField = (path: string, field: ContractFieldSchema) => {
        if (!field || typeof field !== 'object') {
            errors.push(`${path}: field schema must be an object`);
            return;
        }
        if (!field.type) {
            errors.push(`${path}: field type is required`);
            return;
        }
        if (!isPrimitiveType(field.type) && !names.has(field.type)) {
            errors.push(`${path}: unknown type '${field.type}'`);
        }
        if (field.enum && !Array.isArray(field.enum)) {
            errors.push(`${path}: enum must be an array`);
        }
        if (field.type === 'array') {
            if (!field.items) {
                errors.push(`${path}: array items schema is required`);
            } else {
                validateField(`${path}[]`, field.items);
            }
        }
        if (field.type === 'object' && field.properties) {
            Object.entries(field.properties).forEach(([name, child]) => validateField(`${path}.${name}`, child));
        }
    };

    Object.entries(models).forEach(([name, model]) => {
        if (!model || typeof model !== 'object' || !model.fields) {
            errors.push(`models.${name}: fields map is required`);
            return;
        }
        Object.entries(model.fields).forEach(([field, schema]) => validateField(`models.${name}.${field}`, schema));
    });

    const seenRoutes = new Set<string>();
    const seenOperationIds = new Set<string>();
    (contract.routes ?? []).forEach((route, index) => {
        if (!route.method) {
            errors.push(`routes[${index}]: method is required`);
        }
        if (!route.path) {
            errors.push(`routes[${index}]: path is required`);
        }
        const key = `${String(route.method).toUpperCase()} ${route.path}`;
        if (seenRoutes.has(key)) {
            errors.push(`routes[${index}]: duplicate route '${key}'`);
        }
        seenRoutes.add(key);
        const operation = operationName(route, index);
        if (seenOperationIds.has(operation)) {
            errors.push(`routes[${index}]: duplicate operation '${operation}'`);
        }
        seenOperationIds.add(operation);
        if (route.request && !names.has(route.request)) {
            errors.push(`routes[${index}]: unknown request model '${route.request}'`);
        }
        if (route.response && !names.has(route.response)) {
            errors.push(`routes[${index}]: unknown response model '${route.response}'`);
        }
    });

    return errors;
}
