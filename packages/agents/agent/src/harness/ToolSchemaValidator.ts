import { Injectable } from '@tsdi/ioc';

@Injectable()
export class ToolSchemaValidator {
    validateOrThrow(schema: Record<string, any> | undefined, value: unknown, label: string): void {
        if (!schema) {
            return;
        }
        const errors = this.collectErrors(schema, value, '$');
        if (!errors.length) {
            return;
        }
        throw new Error(`${label} validation failed: ${errors.join('; ')}`);
    }

    private collectErrors(schema: Record<string, any>, value: unknown, path: string): string[] {
        const errors: string[] = [];
        const allowedTypes = this.getAllowedTypes(schema.type);
        if (allowedTypes.length && !this.matchesAllowedTypes(value, allowedTypes)) {
            errors.push(`${path} expected ${allowedTypes.join('|')}`);
            return errors;
        }

        if (schema.enum && Array.isArray(schema.enum) && !schema.enum.includes(value)) {
            errors.push(`${path} must be one of ${schema.enum.join(', ')}`);
        }

        if (schema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
            const required = Array.isArray(schema.required) ? schema.required : [];
            required.forEach((key: string) => {
                if (!(key in (value as Record<string, unknown>))) {
                    errors.push(`${path}.${key} is required`);
                }
            });
            const properties = schema.properties ?? {};
            Object.entries(properties).forEach(([key, childSchema]) => {
                if ((value as Record<string, unknown>)[key] === undefined) {
                    return;
                }
                errors.push(...this.collectErrors(childSchema as Record<string, any>, (value as Record<string, unknown>)[key], `${path}.${key}`));
            });
        }

        if (schema.type === 'array' && Array.isArray(value) && schema.items) {
            value.forEach((item, index) => {
                errors.push(...this.collectErrors(schema.items as Record<string, any>, item, `${path}[${index}]`));
            });
        }

        if (schema.type === 'string' && typeof value === 'string') {
            if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
                errors.push(`${path} must have length >= ${schema.minLength}`);
            }
            if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
                errors.push(`${path} must have length <= ${schema.maxLength}`);
            }
        }

        if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
            if (schema.type === 'integer' && !Number.isInteger(value)) {
                errors.push(`${path} must be an integer`);
            }
            if (typeof schema.minimum === 'number' && value < schema.minimum) {
                errors.push(`${path} must be >= ${schema.minimum}`);
            }
            if (typeof schema.maximum === 'number' && value > schema.maximum) {
                errors.push(`${path} must be <= ${schema.maximum}`);
            }
        }

        return errors;
    }

    private getAllowedTypes(type: unknown): string[] {
        if (typeof type === 'string') {
            return [type];
        }
        if (Array.isArray(type)) {
            return type.filter((entry): entry is string => typeof entry === 'string');
        }
        return [];
    }

    private matchesAllowedTypes(value: unknown, allowedTypes: string[]): boolean {
        return allowedTypes.some(type => this.matchesType(value, type));
    }

    private matchesType(value: unknown, type: string): boolean {
        if (type === 'null') {
            return value === null;
        }
        if (type === 'array') {
            return Array.isArray(value);
        }
        if (type === 'object') {
            return !!value && typeof value === 'object' && !Array.isArray(value);
        }
        if (type === 'integer') {
            return typeof value === 'number' && Number.isInteger(value);
        }
        return typeof value === type;
    }
}
