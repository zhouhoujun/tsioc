import { ContractFieldSchema, ContractModelSchema, GenerateContractOptions, MicroserviceContract } from './types';

function typeLiteral(field: ContractFieldSchema): string {
    if (field.enum?.length) {
        return field.enum.map(value => JSON.stringify(value)).join(' | ');
    }
    switch (field.type) {
        case 'string':
            return 'string';
        case 'number':
        case 'integer':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'array':
            return `Array<${field.items ? typeLiteral(field.items) : 'any'}>`;
        case 'object':
            if (!field.properties || !Object.keys(field.properties).length) {
                return 'Record<string, any>';
            }
            return `{ ${Object.entries(field.properties).map(([name, child]) =>
                `${name}${child.required ? '' : '?'}: ${typeLiteral(child)};`).join(' ')} }`;
        default:
            return field.type;
    }
}

function descriptionLines(description: string | undefined, indent: string): string[] {
    if (!description) {
        return [];
    }
    const safe = String(description).replace(/\*\//g, '*\\/');
    return [`${indent}/**`, ...safe.split(/\r?\n/).map(line => `${indent} * ${line}`), `${indent} */`];
}

function decoratorLine(field: ContractFieldSchema, indent: string): string[] {
    const options: string[] = [];
    if (field.description) {
        options.push(`description: ${JSON.stringify(field.description)}`);
    }
    if (field.required) {
        options.push('required: true');
    }
    if (field.type !== 'object') {
        options.push(`type: ${JSON.stringify(field.type)}`);
    }
    if (field.enum?.length) {
        options.push(`enum: ${JSON.stringify(field.enum)}`);
    }
    if (field.format) {
        options.push(`format: ${JSON.stringify(field.format)}`);
    }
    if (!options.length) {
        return [];
    }
    return [`${indent}@ApiModelProperty({ ${options.join(', ')} })`];
}

function modelSource(
    name: string,
    model: ContractModelSchema,
    options: GenerateContractOptions
): string[] {
    const lines: string[] = [];
    lines.push(...descriptionLines(model.description, ''));
    lines.push(`export ${options.dtoStyle === 'interface' ? 'interface' : 'class'} ${name} {`);
    Object.entries(model.fields ?? {}).forEach(([fieldName, field]) => {
        lines.push(...descriptionLines(field.description, '    '));
        if (options.decorators && options.dtoStyle !== 'interface') {
            lines.push(...decoratorLine(field, '    '));
        }
        const optional = field.required ? '' : '?';
        const value = typeLiteral(field);
        if (options.dtoStyle === 'interface') {
            lines.push(`    ${fieldName}${optional}: ${value};`);
        } else {
            lines.push(`    ${fieldName}${field.required ? '!' : '?'}: ${value};`);
        }
    });
    lines.push('}');
    return lines;
}

/**
 * Generate TypeScript DTOs for a contract.
 */
export function generateDto(contract: MicroserviceContract, options: GenerateContractOptions = {}): string {
    const style = options.dtoStyle === 'interface' ? 'interface' : 'class';
    const header = [
        '/**',
        ` * Generated DTOs for ${contract.title || contract.name}.`,
        ' * Do not edit manually; regenerate from the contract manifest.',
        ' */'
    ];
    const lines = [...header];
    if (options.decorators && style !== 'interface') {
        lines.push(`import { ApiModelProperty } from '@tsdi/swagger';`, '');
    }
    Object.entries(contract.models ?? {}).forEach(([name, model], index) => {
        if (index) {
            lines.push('');
        }
        lines.push(...modelSource(name, model, { ...options, dtoStyle: style }));
    });
    return `${lines.join('\n')}\n`;
}
