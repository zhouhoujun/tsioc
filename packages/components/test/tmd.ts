import { Component, OnChanges, OnInit } from '../src';


@Component({
  selector: 'app-comp',
  template: `
      <Text [text]="'Well come'"></Text>
      <Field #fie [label]="label" [(value)]="value"></Field>
      <comp></comp>
  `
})
export class AppComponent implements OnInit {
  label?: string;
  value?: string;
  // ...其他代码
}

@Directive('Input, [Input]')
export class InputDirective {
  @Input() name!: string;
  @Input() value!: string;
  @Output() valueChange: EventEmitter<string> = new EventEmitter();
}


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

  increment() {
    this.count++;
  }

  onInit() {
    console.log('Component initialized');
  }

}
