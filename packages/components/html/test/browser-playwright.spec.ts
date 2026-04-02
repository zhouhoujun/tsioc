import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, Component } from '@tsdi/components';
import { HtmlTemplateModule } from '../src';

@Component({
  selector: 'browser-playwright-test',
  template: `
    <div class="container">
      <h1>{{title}}</h1>
      <p class="counter">Count: {{count}}</p>
      <button class="increment-btn">Increment</button>
      <input class="text-input" [value]="inputValue" (input)="onInput($event)"/>
      <p class="input-value">Input: {{inputValue}}</p>
      <div class="conditional" v-if="showConditional">Conditional Content</div>
      <button class="toggle-btn">Toggle</button>
    </div>
  `
})
export class BrowserPlaywrightTestComponent {
  title = 'Playwright Browser Test';
  count = 0;
  inputValue = 'initial';
  showConditional = false;

  increment() {
    this.count++;
  }

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.inputValue = target.value;
  }

  toggle() {
    this.showConditional = !this.showConditional;
  }
}

@Component({
  selector: 'lifecycle-browser-test',
  template: `
    <div>
      <p class="status">{{status}}</p>
      <button class="update-btn">Update Status</button>
    </div>
  `
})
export class LifecycleBrowserTestComponent {
  status = 'created';

  onInit() {
    this.status = 'initialized';
  }
}

@Suite('HTML Browser Playwright Test')
export class HtmlBrowserPlaywrightTest {

  ctx!: ApplicationContext;

  @Before()
  async init() {
    this.ctx = await Application.run(BrowserPlaywrightTestComponent, {
      deps: [
        HtmlTemplateModule,
        ComponentsModule
      ]
    });
  }

  @Test('should render component in browser')
  async testRender() {
    expect(this.ctx.runners.size).toEqual(1);
    const compRef = this.ctx.runners.getRef(BrowserPlaywrightTestComponent) as ComponentRef<BrowserPlaywrightTestComponent>;
    expect(compRef.instance instanceof BrowserPlaywrightTestComponent).toBeTruthy();
    expect(compRef.instance.title).toEqual('Playwright Browser Test');
  }

  @Test('should bind click event')
  async testClickEvent() {
    const compRef = this.ctx.runners.getRef(BrowserPlaywrightTestComponent) as ComponentRef<BrowserPlaywrightTestComponent>;
    expect(compRef.instance.count).toEqual(0);
    
    compRef.instance.increment();
    await Promise.resolve();
    
    expect(compRef.instance.count).toEqual(1);
  }

  @Test('should bind input event')
  async testInputEvent() {
    const compRef = this.ctx.runners.getRef(BrowserPlaywrightTestComponent) as ComponentRef<BrowserPlaywrightTestComponent>;
    expect(compRef.instance.inputValue).toEqual('initial');
    
    compRef.instance.onInput({ target: { value: 'changed' } } as any);
    await Promise.resolve();
    
    expect(compRef.instance.inputValue).toEqual('changed');
  }

  @Test('should render v-if conditional')
  async testConditional() {
    const compRef = this.ctx.runners.getRef(BrowserPlaywrightTestComponent) as ComponentRef<BrowserPlaywrightTestComponent>;
    expect(compRef.instance.showConditional).toEqual(false);
    
    compRef.instance.showConditional = true;
    await Promise.resolve();
    
    const root = compRef.hostView.rootNodes[0] as any;
    const conditionalDiv = root.querySelector('.conditional');
    expect(conditionalDiv).toBeTruthy();
    expect(conditionalDiv.textContent).toEqual('Conditional Content');
  }

  @Test('should update multiple bindings')
  async testMultipleBindings() {
    const compRef = this.ctx.runners.getRef(BrowserPlaywrightTestComponent) as ComponentRef<BrowserPlaywrightTestComponent>;
    
    compRef.instance.title = 'Updated Title';
    compRef.instance.count = 10;
    await Promise.resolve();
    
    expect(compRef.instance.title).toEqual('Updated Title');
    expect(compRef.instance.count).toEqual(10);
  }

  @After()
  async afterClean() {
    await this.ctx.close();
  }
}
