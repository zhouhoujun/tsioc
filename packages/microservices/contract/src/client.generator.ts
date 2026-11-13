import { ContractFieldSchema, MicroserviceContract, ContractRouteSchema } from './types';
import { contractOperationName } from './client';

export interface GenerateClientOptions {
    /** module path used in the generated import. */
    importPath?: string;
    /** generate `createXxxClient` factory. Default true. */
    factory?: boolean;
}

/**
 * Generate a typed client interface + factory from a contract manifest.
 *
 * The generated module embeds the manifest and delegates to
 * `createContractClient`, so runtime and generated types stay in sync.
 */
export function generateClient(
    contract: MicroserviceContract,
    options: GenerateClientOptions = {}
): string {
    const baseName = toPascal(contract.name);
    const apiName = `${baseName}Api`;
    const factoryName = `create${baseName}Client`;
    const importPath = options.importPath ?? '@tsdi/microservice-contract';
    const models = Object.entries(contract.models ?? {})
        .map(([name, model]) => generateModelInterface(name, model.fields))
        .join('\n\n');
    const methods = (contract.routes ?? [])
        .map(route => generateMethod(route))
        .filter(Boolean)
        .join('\n');
    const factory = options.factory === false ? '' : `

export function ${factoryName}(transport: ContractTransport): ${apiName} {
    return createContractClient<${apiName}>(contract, transport);
}
`;
    return `import {
    ContractCallOptions,
    ContractTransport,
    MicroserviceContract,
    createContractClient
} from '${importPath}';

export const contract: MicroserviceContract = ${JSON.stringify(contract, null, 4)} as MicroserviceContract;

${models}

export interface ${apiName} {
${methods}
}
${factory}`;
}

function generateModelInterface(name: string, fields: Record<string, ContractFieldSchema>): string {
    const lines = Object.entries(fields).map(([field, schema]) => {
        const optional = schema.required ? '' : '?';
        return `    ${safeProperty(field)}${optional}: ${fieldType(schema)};`;
    });
    return `export interface ${name} {\n${lines.join('\n')}\n}`;
}

function generateMethod(route: ContractRouteSchema): string {
    const operation = contractOperationName(route);
    const pathParams = pathParamNames(route.path);
    const argsType = pathParams.length
        ? `{ ${pathParams.map(name => `${safeProperty(name)}: string`).join('; ')} }`
        : undefined;
    const optionsType = route.request
        ? `ContractCallOptions<${route.request}>`
        : 'ContractCallOptions';
    const response = route.response ? route.response : 'void';
    const first = argsType
        ? `args: ${argsType}, options?: ${optionsType}`
        : `options?: ${optionsType}`;
    return `    ${operation}(${first}): Promise<${response}>;`;
}

function pathParamNames(path: string): string[] {
    const names: string[] = [];
    for (const match of path.matchAll(/[:{]([A-Za-z0-9_]+)[}]?/g)) {
        names.push(match[1]);
    }
    return names;
}

function fieldType(schema: ContractFieldSchema): string {
    if (schema.enum?.length) {
        return schema.enum.map(value => typeof value === 'string' ? JSON.stringify(value) : String(value)).join(' | ');
    }
    if (schema.type === 'array') {
        return `${schema.items ? fieldType(schema.items) : 'any'}[]`;
    }
    if (schema.type === 'object') {
        if (!schema.properties) {
            return 'Record<string, any>';
        }
        return `{ ${Object.entries(schema.properties)
            .map(([name, field]) => `${safeProperty(name)}${field.required ? '' : '?'}: ${fieldType(field)}`)
            .join('; ')} }`;
    }
    return schema.type;
}

function safeProperty(name: string): string {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function toPascal(value: string): string {
    return value
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('') || 'Contract';
}
