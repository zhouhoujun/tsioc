import { Component, OnChanges, OnInit } from '../src';


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
