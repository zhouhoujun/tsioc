import { Provider, token } from '@tsdi/ioc';
import { SchemaMetadata } from './schema';

export const TEMPLATE_SCHEMAS = token<SchemaMetadata[]>('TEMPLATE_SCHEMAS');

export function provideTemplateSchemas(...schemas: SchemaMetadata[]): Provider {
    return { provide: TEMPLATE_SCHEMAS, useValue: schemas };
}
