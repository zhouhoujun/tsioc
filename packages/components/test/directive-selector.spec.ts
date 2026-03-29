import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Component, Directive } from '../src';
import { CUSTOM_ELEMENTS } from '../src';
import { DirectiveDef, DirectiveType } from '../src/refs/directive';
import { getClassRef } from '@tsdi/ioc';

@Suite('directive selector test')
export class DirectiveSelectorTest {

    @Test('should support element selector')
    testElementSelector() {
        @Directive({
            selector: 'my-button'
        })
        class MyButtonDirective {
        }

        const def = getClassRef(MyButtonDirective).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('my-button');
    }

    @Test('should support custom element selector with hyphen')
    testCustomElementSelector() {
        @Directive({
            selector: 'custom-element'
        })
        class CustomDirective {
        }

        const def = getClassRef(CustomDirective).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('custom-element');
    }

    @Test('should support attribute selector without brackets')
    testAttributeSelectorWithoutBrackets() {
        @Directive({
            selector: 'myAttr'
        })
        class AttrDirective {
        }

        const def = getClassRef(AttrDirective).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('[myAttr]');
    }

    @Test('should support attribute selector with brackets')
    testAttributeSelectorWithBrackets() {
        @Directive({
            selector: '[v-bind]'
        })
        class BindDirective {
        }

        const def = getClassRef(BindDirective).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('[v-bind]');
    }

    @Test('should support attribute selector with value')
    testAttributeSelectorWithValue() {
        @Directive({
            selector: '[type=button]'
        })
        class TypeButtonDirective {
        }

        const def = getClassRef(TypeButtonDirective).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('[type=button]');
    }

    @Test('should support structural directive selector')
    testStructuralDirectiveSelector() {
        @Directive({
            selector: '*if',
            dirType: DirectiveType.Conditional
        })
        class IfDirective {
        }

        const def = getClassRef(IfDirective).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('[*if]');
    }

    @Test('should support multiple selectors')
    testMultipleSelectors() {
        @Directive({
            selector: 'button, input, [v-bind]'
        })
        class MultiDirective {
        }

        const def = getClassRef(MultiDirective).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('button,input,[v-bind]');
    }

    @Test('should support element property in directive def')
    testElementProperty() {
        const MockHTMLElement = function() {} as any;
        @Directive({
            selector: 'my-element',
            element: MockHTMLElement
        })
        class MyElementDirective {
        }

        const def = getClassRef(MyElementDirective).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('my-element');
        expect(def.element).toBe(MockHTMLElement);
    }

    @Test('should transform class name as default selector')
    testDefaultSelector() {
        @Directive({})
        class MyTestDirective {
        }

        const def = getClassRef(MyTestDirective).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('[MyTestDirective]');
    }

    @Test('should export custom element selectors to CUSTOM_ELEMENTS collection')
    testCustomElementExport() {
        @Directive({ selector: 'my-el' })
        class MyElDirective {
        }

        const def = getClassRef(MyElDirective).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('my-el');
        const hasCustomExport = def.exportProviders?.some(p => (p as any).provide === CUSTOM_ELEMENTS);
        expect(hasCustomExport).toBeTruthy();
    }
}


@Suite('component selector test')
export class ComponentSelectorTest {

    @Test('should support element selector for component')
    testComponentElementSelector() {
        @Component({
            selector: 'app-root'
        })
        class RootComponent {
        }

        const def = getClassRef(RootComponent).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('app-root');
    }

    @Test('should support attribute selector for component')
    testComponentAttributeSelector() {
        @Component({
            selector: '[appRoot]'
        })
        class AttrComponent {
        }

        const def = getClassRef(AttrComponent).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('[appRoot]');
    }

    @Test('should support mixed selector for component')
    testMixedSelector() {
        @Component({
            selector: 'app-main, [appMain]'
        })
        class MixedComponent {
        }

        const def = getClassRef(MixedComponent).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('app-main, [appMain]');
    }

    @Test('should support element property for component')
    testComponentElementProperty() {
        const MockHTMLElement = function() {} as any;
        @Component({
            selector: 'my-component',
            element: MockHTMLElement
        })
        class MyComponent {
        }

        const def = getClassRef(MyComponent).getAnnotation<DirectiveDef>();
        expect(def.selector).toEqual('my-component');
        expect(def.element).toBe(MockHTMLElement);
    }
}
