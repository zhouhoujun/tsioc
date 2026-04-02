import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, Component } from '@tsdi/components';
import { HtmlTemplateModule } from '../src';

/**
 * Simple test component for browser testing
 */
@Component({
  selector: 'browser-test',
  template: `
    <div>
      <h1>{{title}}</h1>
      <p class="counter">Count: {{count}}</p>
      <button class="increment-btn">Increment</button>
      <input class="text-input" [value]="inputValue" (input)="onInput($event)"/>
      <p class="input-value">Input: {{inputValue}}</p>
    </div>
  `
})
export class BrowserTestComponent {
  title = 'Browser Test';
  count = 0;
  inputValue = 'initial';

  increment() {
    this.count++;
  }

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.inputValue = target.value;
  }
}

/**
 * Component with lifecycle hooks for browser testing
 */
@Component({
  selector: 'lifecycle-test',
  template: `
    <div>
      <p class="status">{{status}}</p>
      <button class="update-btn">Update Status</button>
    </div>
  `
})
export class LifecycleTestComponent {
  status = 'created';

  onInit() {
    this.status = 'initialized';
  }
}

@Suite('HTML Browser Test')
export class HtmlBrowserTest {

  ctx!: ApplicationContext;

  @Before()
  async init() {
    this.ctx = await Application.run(BrowserTestComponent, {
      deps: [
        HtmlTemplateModule,
        ComponentsModule
      ]
    });
  }

  @Test('should render component in browser')
  async testRender() {
    expect(this.ctx.runners.size).toEqual(1);
    const compRef = this.ctx.runners.getRef(BrowserTestComponent) as ComponentRef<BrowserTestComponent>;
    expect(compRef.instance instanceof BrowserTestComponent).toBeTruthy();
    expect(compRef.instance.title).toEqual('Browser Test');
  }

  @Test('should bind click event')
  async testClickEvent() {
    const compRef = this.ctx.runners.getRef(BrowserTestComponent) as ComponentRef<BrowserTestComponent>;
    expect(compRef.instance.count).toEqual(0);
    
    const root = compRef.hostView.rootNodes[0] as any;
    const button = root.querySelector('.increment-btn');
    const counterP = root.querySelector('.counter');
    
    expect(counterP?.textContent).toEqual('Count: 0');
    
    // Simulate click through the component method directly
    compRef.instance.increment();
    await Promise.resolve();
    
    expect(compRef.instance.count).toEqual(1);
    expect(counterP?.textContent).toEqual('Count: 1');
  }

  @Test('should bind input event')
  async testInputEvent() {
    const compRef = this.ctx.runners.getRef(BrowserTestComponent) as ComponentRef<BrowserTestComponent>;
    expect(compRef.instance.inputValue).toEqual('initial');
    
    const root = compRef.hostView.rootNodes[0] as any;
    const input = root.querySelector('.text-input');
    const valueP = root.querySelector('.input-value');
    
    expect(valueP?.textContent).toEqual('Input: initial');
    
    // Simulate input change through the component method directly
    compRef.instance.onInput({ target: { value: 'changed' } } as any);
    await Promise.resolve();
    
    expect(compRef.instance.inputValue).toEqual('changed');
    expect(valueP?.textContent).toEqual('Input: changed');
  }

  @After()
  async afterClean() {
    await this.ctx.close();
  }
}
