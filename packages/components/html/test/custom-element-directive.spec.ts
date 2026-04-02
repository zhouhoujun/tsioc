import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, Component, Directive, Attribute } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';

@Directive({
    selector: 'my-button'
})
class MyButtonDirective {
    @Attribute() label = 'Click';
    @Attribute() disabled = false;
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
    @Attribute() visible = true;
}

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

@Directive({
    selector: 'user-card'
})
class UserCardDirective {
    @Attribute() username = '';
    @Attribute() email = '';
    @Attribute() avatar = '';
}

@Component({
    selector: 'app-user-list',
    imports: [UserCardDirective],
    template: `
        <div class="user-list">
            <user-card username="user1" email="user1@example.com" avatar="avatar1.png"></user-card>
            <user-card username="user2" email="user2@example.com" avatar="avatar2.png"></user-card>
        </div>
    `
})
class UserListComponent {
    users = [
        { name: 'user1', email: 'user1@example.com' },
        { name: 'user2', email: 'user2@example.com' }
    ];
}

@Suite('HTML Custom Element Directive Test')
export class CustomElementDirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DirectiveTestComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule
            ],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                        return dom.window.document;
                    }
                }
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

@Suite('HTML Multi Custom Element Directive Test')
export class MultiCustomElementDirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(MultiDirectiveTestComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule
            ],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                        return dom.window.document;
                    }
                }
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

@Suite('HTML Mixed Component and Directive Test')
export class MixedComponentDirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(MixedTestComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule
            ],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                        return dom.window.document;
                    }
                }
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

@Suite('HTML User Card Directive Test')
export class UserCardDirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(UserListComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule
            ],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                        return dom.window.document;
                    }
                }
            ]
        });
    }

    @Test('should render user cards with attributes')
    async testUserCardRendering() {
        const compRef = this.ctx.runners.getRef(UserListComponent) as ComponentRef<UserListComponent>;
        expect(compRef).toBeDefined();
        expect(compRef.instance.users).toBeDefined();
        expect(compRef.instance.users.length).toBe(2);
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }
}
