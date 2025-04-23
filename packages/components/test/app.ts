import { Component, OnInit } from "../src";

@Component({
    selector: 'app-root',
    template: `
        <div>
            <h1>{{title}}</h1>
            <button @click="handleClick">Click me</button>
            <p :class="{active: isActive}">Status: {{status}}</p>
        </div>
    `
})
export class AppComponent implements OnInit {
    title = 'Hello World';
    isActive = true;
    status = 'Ready';

    onInit() {
        // 初始化逻辑
    }

    handleClick() {
        this.status = 'Clicked!';
    }
}




@Component({
    selector: 'app-comp',
    template: `
        <Text [text]="'Well come'"></Text>
        <Field #fie [label]="label" [(value)]="value"></Field>
        <comp></comp>
    `
  })
  export class AppComponent2 implements OnInit {
    onInit(): void {
      throw new Error('Method not implemented.');
    }
    label?: string;
    value?: string;
    // ...其他代码
  }
  
  // @Directive('Input, [Input]')
  // export class InputDirective {
  //   @Input() name!: string;
  //   @Input() value!: string;
  //   @Output() valueChange: EventEmitter<string> = new EventEmitter();
  // }
  
  
  @Component({
      selector: 'Text'
  })
  export class TextComponet {
      text!: string;
  }
  
  
  
  @Component({
    selector: 'app-example',
    template: `
      <div>
        <h1>{{ title }}</h1>
        <p>Count: {{ count }}</p>
        <input v-model="value" />
        <p>Value: {{ value }}</p>
        <button @click="increment">Increment</button>
      </div>
    `,
    styles: [
      `h1 { color: blue; }`,
      `button { padding: 5px 10px; }`
    ]
  })
  export class ExampleComponent implements OnInit {
    title = 'Example Component';
    count = 0;
    value = 'test';
  
    increment() {
      this.count++;
    }
  
    onInit() {
      console.log('Component initialized');
    }
  
  }
  