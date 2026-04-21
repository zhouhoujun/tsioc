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
export declare const CUSTOM_ELEMENTS_SCHEMA: {
    name: string;
};
/**
 * Defines a schema that allows any property on any element.
 */
export declare const NO_ERRORS_SCHEMA: {
    name: string;
};
