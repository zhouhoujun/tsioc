import { Attribute, Component, OnDestroy, OnInit } from '@tsdi/components';

@Component({
  selector: 'app-root',
  template: {
    div: {
      h1: { '#text': '{{title}}' },
      button: { '@click': 'handleClick', '#text': 'Click me' },
      p: { ':class': '{active: isActive}', '#text': 'Status: {{status}}' }
    }
  }
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
  template: {
    div: {
      Text: { '[text]': "'Well come'" },
      Field: { '#fie': true, '[label]': 'label', '[(value)]': 'value' },
      'app-example': {}
    }
  }
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
  selector: 'Field'
})
export class FieldComponet {
  @Attribute() label!: string;
  @Attribute() value!: string;
}


@Component({
  selector: 'Text'
})
export class TextComponet {
  @Attribute() text!: string;
}



@Component({
  selector: 'app-example',
  template: {
    div: [
      { 
        h1: { 
          '#text': '{{ title }}' 
        }
      },
      { p: { '#text': 'Count: {{ count }}' } },
      { input: { 'v-model': 'value' } },
      { p: { '#text': 'Value: {{ value }}' } },
      { button: { '@click': 'increment', '#text': 'Increment' } },
      { button: { '@click': 'clickWithData($event, item)', '#text': 'Increment' } },
      { p: { '#text': 'Today: {{ today | date-format:\'yyyy-MM-dd\' }}' } }
    ]
  },
  styles: [
    `h1 { color: blue; }`,
    `button { padding: 5px 10px; }`
  ]
})
export class ExampleComponent implements OnInit, OnDestroy {

  title = 'Example Component';
  count = 0;
  value = 'test';

  today?: Date;

  item = {
    name: 'zhangsan',
    checked: false
  }

  increment() {
    this.count++;
  }

  clickWithData(event: any, item: any) {
    item.checked = true;
  }

  onInit() {
    this.today = new Date('2023-01-01');
    console.log('Component initialized');
  }

  onDestroy(): void {
    console.log('Component destroyed');
  }

}


@Component({
  selector: 'app-comp2',
  template: {
    '#text': '123',
    a: '123',
    b: '456',
    c: '789',
    childNodes: [
      { $tag: 'Text', a: '123' },
      { $tag: 'Text', a: '456' },
      { $tag: 'Text', a: '789' },
      { $tag: 'Field', a: '123' },
    ]
  }
})
export class JsonTemplateComponent {

}