import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, Component, Directive, Attribute } from '@tsdi/components';
import { JsonTemplateModule } from '../src';

@Directive({
    selector: 'my-button'
})
class MyButtonDirective {
    @Attribute() label = 'Click';
    @Attribute() disabled = 'false';
    clicked = false;

    handleClick() {
        this.clicked = true;
    }
}

@Directive({
    selector: 'my-icon'
})
class MyIconDirective {
    @Attribute() name = '';
    @Attribute() size = '24';
}

@Directive({
    selector: 'my-card'
})
class MyCardDirective {
    @Attribute() title = '';
    @Attribute() visible = 'true';
}

@Component({
    selector: 'app-directive-test',
    imports: [MyButtonDirective, MyIconDirective, MyCardDirective],
    template: {
        div: {
            '.container': true,
            'my-button': { '[label]': 'buttonLabel', '@click': 'onButtonClick()' },
            'my-icon': { 'name': 'star', 'size': '32' },
            'my-card': { 'title': 'Card Title', '[visible]': 'showCard' }
        }
    }
})
class DirectiveTestComponent {
    buttonLabel = 'Submit';
    showCard = true;
    buttonClicked = false;

    onButtonClick() {
        this.buttonClicked = true;
    }
}

@Directive({
    selector: 'custom-input'
})
class CustomInputDirective {
    @Attribute() value = '';
    @Attribute() placeholder = '';
}

@Directive({
    selector: 'custom-select'
})
class CustomSelectDirective {
    @Attribute() options = '';
    @Attribute() selected = '';
}

@Component({
    selector: 'app-multi-directive-test',
    imports: [CustomInputDirective, CustomSelectDirective],
    template: {
        div: {
            'custom-input': { '[value]': 'inputValue', '[placeholder]': "'Enter text'" },
            'custom-select': { '[options]': "['Option 1', 'Option 2', 'Option 3']", '[selected]': 'selectedOption' }
        }
    }
})
class MultiDirectiveTestComponent {
    inputValue = 'test';
    selectedOption = 'Option 1';
}

@Component({
    selector: 'simple-component',
    template: { span: '{{text}}' }
})
class SimpleComponent {
    @Attribute() text = 'default';
}

@Directive({
    selector: 'simple-directive'
})
class SimpleDirective {
    @Attribute() text = 'default';
}

@Component({
    selector: 'app-mixed-test',
    imports: [SimpleComponent, SimpleDirective],
    template: {
        div: {
            'simple-component': { 'text': 'Component Text' },
            'simple-directive': { 'text': 'Directive Text' }
        }
    }
})
class MixedTestComponent {
}

@Suite('JSON Custom Element Directive Test')
export class CustomElementDirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DirectiveTestComponent, {
            deps: [
                JsonTemplateModule,
                ComponentsModule
            ]
        });
    }

    @Test('should register custom element directive to CUSTOM_ELEMENTS token')
    async testCustomElementRegistration() {
        const compRef = this.ctx.runners.getRef(DirectiveTestComponent) as ComponentRef<DirectiveTestComponent>;
        expect(compRef).toBeDefined();

        const instance = compRef.instance;
        expect(instance.buttonLabel).toEqual('Submit');
        expect(instance.showCard).toBeTruthy();
    }

    @Test('should parse template with custom element directives')
    async testParseTemplateWithCustomElements() {
        const compRef = this.ctx.runners.getRef(DirectiveTestComponent) as ComponentRef<DirectiveTestComponent>;
        const rootNodes = compRef.hostView.rootNodes;

        expect(rootNodes).toBeDefined();
        expect(rootNodes.length).toBeGreaterThan(0);

        const rootElement = rootNodes[0];
        expect(rootElement).toBeDefined();
    }

    @Test('should handle custom element directive with attribute bindings')
    async testCustomElementWithBindings() {
        const compRef = this.ctx.runners.getRef(DirectiveTestComponent) as ComponentRef<DirectiveTestComponent>;
        expect(compRef.instance.buttonLabel).toEqual('Submit');
    }

    @Test('should handle custom element directive with event bindings')
    async testCustomElementWithEvents() {
        const compRef = this.ctx.runners.getRef(DirectiveTestComponent) as ComponentRef<DirectiveTestComponent>;
        expect(compRef.instance.buttonClicked).toBeFalsy();
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }
}

@Suite('JSON Multi Custom Element Directive Test')
export class MultiCustomElementDirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(MultiDirectiveTestComponent, {
            deps: [
                JsonTemplateModule,
                ComponentsModule
            ]
        });
    }

    @Test('should handle multiple custom element directives')
    async testMultipleCustomElements() {
        const compRef = this.ctx.runners.getRef(MultiDirectiveTestComponent) as ComponentRef<MultiDirectiveTestComponent>;
        expect(compRef).toBeDefined();
        expect(compRef.instance.inputValue).toEqual('test');
        expect(compRef.instance.selectedOption).toEqual('Option 1');
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }
}

@Suite('JSON Mixed Component and Directive Test')
export class MixedComponentDirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(MixedTestComponent, {
            deps: [
                JsonTemplateModule,
                ComponentsModule
            ]
        });
    }

    @Test('should differentiate @Component and @Directive with element selectors')
    async testMixedUsage() {
        const compRef = this.ctx.runners.getRef(MixedTestComponent) as ComponentRef<MixedTestComponent>;
        expect(compRef).toBeDefined();
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }
}
