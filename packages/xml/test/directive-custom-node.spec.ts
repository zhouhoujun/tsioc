import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Directive } from '@tsdi/components';
import { getClassRef } from '@tsdi/ioc';
import { CUSTOM_ELEMENTS, DIRECTIVES } from '@tsdi/components';

@Suite('directive custom node test - xml')
export class XmlDirectiveCustomNodeTest {

  @Test('custom element directive exports to CUSTOM_ELEMENTS')
  testCustomElementExportXml() {
    @Directive({ selector: 'xml-el' })
    class XmlElDirective {}

    const def = getClassRef(XmlElDirective).getAnnotation<any>() as any;
    expect(def.selector).toEqual('xml-el');
    const hasCustExport = def.exportProviders?.some((p: any) => (p as any).provide === CUSTOM_ELEMENTS);
    expect(hasCustExport).toBeTruthy();
  }

  @Test('attribute directive exports to DIRECTIVES')
  testAttributeDirectiveExportXml() {
    @Directive({ selector: '[xmlAttr]' })
    class XmlAttrDirective {}

    const def = getClassRef(XmlAttrDirective).getAnnotation<any>() as any;
    expect(def.selector).toEqual('[xmlAttr]');
    const hasDirExport = def.exportProviders?.some((p: any) => (p as any).provide === DIRECTIVES);
    expect(hasDirExport).toBeTruthy();
  }
}
