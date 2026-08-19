

/**
 * A schema definition associated with an Module.
 *
 * @see {@link NgModule}
 * @see {@link CUSTOM_ELEMENTS_SCHEMA}
 * @see {@link NO_ERRORS_SCHEMA}
 *
 * @param name The name of a defined schema.
 *
 * @publicApi
 */
export declare interface SchemaMetadata {
    name: string;
}

/**
 * Elements named with dash case (`-`)
 * Element properties named with dash case (`-`).
 */
export const CUSTOM_ELEMENTS_SCHEMA = {
    name: 'custom-elements',
};

/**
 * Defines a schema that allows any property on any element.
 */
export const NO_ERRORS_SCHEMA = {
    name: 'no-errors-schema',
};

export const COMMON_ELEMENTS_SCHEMA = {
    name: 'common-elements',
};

const COMMON_ELEMENT_NAMES = new Set([
    'a', 'article', 'aside', 'br', 'button', 'code', 'div', 'em', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'img', 'input', 'label', 'li',
    'main', 'nav', 'ol', 'option', 'p', 'pre', 'section', 'select', 'small', 'span',
    'strong', 'table', 'tbody', 'td', 'textarea', 'th', 'thead', 'tr', 'ul'
]);

export function mergeTemplateSchemas(
    defaults?: readonly SchemaMetadata[] | null,
    local?: readonly SchemaMetadata[] | null
): SchemaMetadata[] {
    return Array.from(new Map(
        [...(defaults || []), ...(local || [])].map(schema => [schema.name, schema])
    ).values());
}

export function hasSchema(schemas: readonly SchemaMetadata[] | undefined, schema: SchemaMetadata): boolean {
    return !!schemas?.some(item => item?.name === schema.name);
}

export function schemaAllowsElement(name: string, schemas?: readonly SchemaMetadata[]): boolean {
    if (COMMON_ELEMENT_NAMES.has(String(name || '').toLowerCase())) {
        return true;
    }
    if (hasSchema(schemas, NO_ERRORS_SCHEMA)) {
        return true;
    }
    return hasSchema(schemas, CUSTOM_ELEMENTS_SCHEMA) && String(name || '').includes('-');
}

export function schemaAllowsProperty(name: string, schemas?: readonly SchemaMetadata[]): boolean {
    if (hasSchema(schemas, NO_ERRORS_SCHEMA)) {
        return true;
    }
    return hasSchema(schemas, CUSTOM_ELEMENTS_SCHEMA) && String(name || '').includes('-');
}

export function validateSchemaElement(name: string, schemas: readonly SchemaMetadata[]): void {
    if (!schemaAllowsElement(name, schemas)) {
        throw new Error(`Element <${name}> is not allowed by the component schemas.`);
    }
}
