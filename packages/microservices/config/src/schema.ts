export type ConfigFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';

export interface ConfigFieldSchema {
    type: ConfigFieldType;
    required?: boolean;
    enum?: Array<string | number | boolean>;
    default?: any;
    description?: string;
}

/**
 * Typed schema for a configuration document.
 *
 * Field keys use dot notation (`server.port`). The manager stores the applied
 * schema version under the reserved `schemaVersion` key.
 */
export interface ConfigSchema {
    version: number;
    fields: Record<string, ConfigFieldSchema>;
    /**
     * Migration transforms keyed by the *from* version:
     * `0` upgrades v0 → v1, `1` upgrades v1 → v2, ...
     */
    migrations?: Record<number, (config: Record<string, any>) => Record<string, any>>;
}

export class ConfigSchemaError extends Error {
    constructor(readonly errors: string[]) {
        super(`Invalid configuration:\n- ${errors.join('\n- ')}`);
        this.name = 'ConfigSchemaError';
    }
}

const RESERVED_VERSION_KEY = 'schemaVersion';

function readPath(config: Record<string, any>, key: string): any {
    let value: any = config;
    for (const part of key.split('.')) {
        if (value == null) {
            return undefined;
        }
        value = value[part];
    }
    return value;
}

function typeOf(value: any): ConfigFieldType | 'null' | 'undefined' {
    if (value === null) {
        return 'null';
    }
    if (value === undefined) {
        return 'undefined';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'integer' : 'number';
    }
    if (typeof value === 'object') {
        return 'object';
    }
    return typeof value as ConfigFieldType;
}

function matchesType(value: any, expected: ConfigFieldType): boolean {
    const actual = typeOf(value);
    if (expected === 'number') {
        return actual === 'number' || actual === 'integer';
    }
    return actual === expected;
}

/**
 * Migrate a config document to the schema's current version.
 */
export function migrateConfig(config: Record<string, any>, schema: ConfigSchema): {
    config: Record<string, any>;
    warnings: string[];
} {
    const warnings: string[] = [];
    const current = config?.[RESERVED_VERSION_KEY];
    let version = current == null ? 0 : Number(current);
    if (!Number.isInteger(version) || version < 0) {
        throw new ConfigSchemaError([`${RESERVED_VERSION_KEY} must be a non-negative integer, got '${current}'`]);
    }
    if (version > schema.version) {
        throw new ConfigSchemaError([
            `config schemaVersion ${version} is newer than supported v${schema.version}; upgrade the application`
        ]);
    }
    let migrated = { ...(config ?? {}) };
    while (version < schema.version) {
        const migrate = schema.migrations?.[version];
        if (!migrate) {
            throw new ConfigSchemaError([
                `no migration registered from schema v${version} to v${version + 1}`
            ]);
        }
        migrated = migrate(migrated) ?? migrated;
        version += 1;
        warnings.push(`config migrated to v${version}`);
    }
    migrated[RESERVED_VERSION_KEY] = schema.version;
    return { config: migrated, warnings };
}

/**
 * Validate fields after migration. Returns actionable field-path errors.
 */
export function validateConfigSchema(config: Record<string, any>, schema: ConfigSchema): string[] {
    const errors: string[] = [];
    Object.entries(schema.fields ?? {}).forEach(([key, field]) => {
        let value = readPath(config, key);
        if (value === undefined && field.default !== undefined) {
            value = field.default;
            // Materialize defaults for downstream readers.
            const parts = key.split('.');
            let target: any = config;
            for (let index = 0; index < parts.length - 1; index++) {
                target[parts[index]] = target[parts[index]] ?? {};
                target = target[parts[index]];
            }
            target[parts[parts.length - 1]] = value;
        }
        if (value === undefined) {
            if (field.required) {
                errors.push(`${key} is required`);
            }
            return;
        }
        if (!matchesType(value, field.type)) {
            errors.push(`${key} must be ${field.type}, got '${typeOf(value)}'`);
            return;
        }
        if (field.enum?.length && !field.enum.includes(value)) {
            errors.push(`${key} must be one of ${field.enum.map(item => JSON.stringify(item)).join(', ')}, got '${value}'`);
        }
    });
    return errors;
}

/**
 * Migrate + validate in one step. Throws `ConfigSchemaError` on failure.
 */
export function applyConfigSchema(config: Record<string, any>, schema?: ConfigSchema): {
    config: Record<string, any>;
    warnings: string[];
} {
    if (!schema) {
        return { config: config ?? {}, warnings: [] };
    }
    const migrated = migrateConfig(config ?? {}, schema);
    const errors = validateConfigSchema(migrated.config, schema);
    if (errors.length) {
        throw new ConfigSchemaError(errors);
    }
    return migrated;
}
