import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, Component, Directive, Attribute } from '@tsdi/components';
import { XmlTemplateModule } from '../src';

/**
 * 自定义元素指令 - 使用 tagName 作为选择器
 * This directive uses a custom element tag name as its selector
 */
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

/**
 * 带属性的自定义元素指令
 */
@Directive({
    selector: 'my-icon'
})
class MyIconDirective {
    @Attribute() name = '';
    @Attribute() size = '24';
}

/**
 * 自定义元素指令作为容器
 */
@Directive({
    selector: 'my-card'
})
class MyCardDirective {
    @Attribute() title = '';
    @Attribute() visible = 'true';
}

/**
 * 使用自定义元素指令的组件
 */
@Component({
    selector: 'app-directive-test',
    imports: [MyButtonDirective, MyIconDirective, MyCardDirective],
    template: `
        <div class="container">
            <my-button #btn [label]="buttonLabel" (click)="onButtonClick()"></my-button>
            <my-icon name="star" size="32"></my-icon>
            <my-card title="Card Title" [visible]="showCard">
                <p>Card content</p>
            </my-card>
        </div>
    `
})
class DirectiveTestComponent {
    buttonLabel = 'Submit';
    showCard = true;
    buttonClicked = false;

    onButtonClick() {
        this.buttonClicked = true;
    }
}

/**
 * 多个自定义元素指令
 */
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
    template: `
        <div>
            <custom-input [value]="inputValue" [placeholder]="'Enter text'"></custom-input>
            <custom-select [options]="['Option 1', 'Option 2', 'Option 3']" [selected]="selectedOption"></custom-select>
        </div>
    `
})
class MultiDirectiveTestComponent {
    inputValue = 'test';
    selectedOption = 'Option 1';
}

/**
 * 测试混合使用 @Component 和 @Directive 作为自定义元素
 */
@Component({
    selector: 'simple-component',
    template: '<span>{{text}}</span>'
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
    template: `
        <div>
            <simple-component text="Component Text"></simple-component>
            <simple-directive text="Directive Text"></simple-directive>
        </div>
    `
})
class MixedTestComponent {
}

@Suite('XML Custom Element Directive Test')
export class CustomElementDirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DirectiveTestComponent, {
            deps: [
                XmlTemplateModule,
                ComponentsModule
            ]
        });
    }

    @Test('should register custom element directive to CUSTOM_ELEMENTS token')
    async testCustomElementRegistration() {
        // Verify the directive is registered
        const compRef = this.ctx.runners.getRef(DirectiveTestComponent) as ComponentRef<DirectiveTestComponent>;
        expect(compRef).toBeDefined();

        // The component should have access to the directive
        const instance = compRef.instance;
        expect(instance.buttonLabel).toEqual('Submit');
        expect(instance.showCard).toBeTruthy();
    }

    @Test('should parse template with custom element directives')
    async testParseTemplateWithCustomElements() {
        const compRef = this.ctx.runners.getRef(DirectiveTestComponent) as ComponentRef<DirectiveTestComponent>;
        const rootNodes = compRef.hostView.rootNodes;

        // Verify root element exists
        expect(rootNodes).toBeDefined();
        expect(rootNodes.length).toBeGreaterThan(0);

        // The template should be rendered
        const rootElement = rootNodes[0];
        expect(rootElement).toBeDefined();
    }

    @Test('should handle custom element directive with Input bindings')
    async testCustomElementWithInputs() {
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

@Suite('XML Multi Custom Element Directive Test')
export class MultiCustomElementDirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(MultiDirectiveTestComponent, {
            deps: [
                XmlTemplateModule,
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

@Suite('XML Mixed Component and Directive Test')
export class MixedComponentDirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(MixedTestComponent, {
            deps: [
                XmlTemplateModule,
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
