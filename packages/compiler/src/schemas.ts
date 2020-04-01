import { SchemaMetadata, SecurityContext } from './core';

export abstract class ElementSchemaRegistry {
    abstract hasProperty(tagName: string, propName: string, schemaMetas: SchemaMetadata[]): boolean;
    abstract hasElement(tagName: string, schemaMetas: SchemaMetadata[]): boolean;
    abstract securityContext(elementName: string, propName: string, isAttribute: boolean):
        SecurityContext;
    abstract allKnownElementNames(): string[];
    abstract getMappedPropName(propName: string): string;
    abstract getDefaultComponentElementName(): string;
    abstract validateProperty(name: string): { error: boolean, msg?: string };
    abstract validateAttribute(name: string): { error: boolean, msg?: string };
    abstract normalizeAnimationStyleProperty(propName: string): string;
    abstract normalizeAnimationStyleValue(
        camelCaseProp: string, userProvidedProp: string,
        val: string | number): { error: string, value: string };
}


export type I18nMeta = {
    id?: string,
    customId?: string,
    legacyIds?: string[],
    description?: string,
    meaning?: string
  };
  