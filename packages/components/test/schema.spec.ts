import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    Component,
    ComponentDef,
    CUSTOM_ELEMENTS_SCHEMA,
    COMMON_ELEMENTS_SCHEMA,
    NO_ERRORS_SCHEMA,
    hasSchema,
    mergeTemplateSchemas,
    schemaAllowsElement,
    schemaAllowsProperty,
    validateSchemaElement
} from '../src';
import { getClassRef } from '@tsdi/ioc';

@Component({
    selector: 'schema-host',
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: '<third-party-widget></third-party-widget>'
})
class SchemaHostComponent {}

@Suite('template schemas')
export class TemplateSchemaTest {
    @Test('defines schemas directly on component metadata')
    componentMetadata() {
        const def = getClassRef(SchemaHostComponent).getAnnotation<ComponentDef>();
        expect(def.schemas).toEqual([CUSTOM_ELEMENTS_SCHEMA]);
    }
    @Test('matches schemas by stable name')
    matchesByName() {
        expect(hasSchema([{ name: CUSTOM_ELEMENTS_SCHEMA.name }], CUSTOM_ELEMENTS_SCHEMA)).toBeTruthy();
        expect(hasSchema([], CUSTOM_ELEMENTS_SCHEMA)).toBeFalsy();
    }

    @Test('custom elements schema only allows dash-case names')
    customElements() {
        expect(schemaAllowsElement('agent-panel', [CUSTOM_ELEMENTS_SCHEMA])).toBeTruthy();
        expect(schemaAllowsElement('panel', [CUSTOM_ELEMENTS_SCHEMA])).toBeFalsy();
        expect(schemaAllowsProperty('data-kind', [CUSTOM_ELEMENTS_SCHEMA])).toBeTruthy();
        expect(schemaAllowsProperty('value', [CUSTOM_ELEMENTS_SCHEMA])).toBeFalsy();
    }

    @Test('allows common renderer elements through the global schema')
    commonElements() {
        expect(COMMON_ELEMENTS_SCHEMA.name).toEqual('common-elements');
        expect(schemaAllowsElement('div')).toBeTruthy();
        expect(schemaAllowsElement('span')).toBeTruthy();
        expect(schemaAllowsElement('br')).toBeTruthy();
    }

    @Test('no errors schema allows all names')
    noErrors() {
        expect(schemaAllowsElement('unknown', [NO_ERRORS_SCHEMA])).toBeTruthy();
        expect(schemaAllowsProperty('unknown', [NO_ERRORS_SCHEMA])).toBeTruthy();
    }

    @Test('rejects elements outside explicit component schemas')
    rejectsUnknownElement() {
        expect(() => validateSchemaElement('unknown', [CUSTOM_ELEMENTS_SCHEMA])).toThrow();
        expect(() => validateSchemaElement('third-party-widget', [CUSTOM_ELEMENTS_SCHEMA])).not.toThrow();
    }

    @Test('merges module defaults with local schemas')
    mergeSchemas() {
        expect(mergeTemplateSchemas([CUSTOM_ELEMENTS_SCHEMA], [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]))
            .toEqual([CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]);
    }
}
