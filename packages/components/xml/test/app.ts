import { Attribute, Component, Computed, OnDestroy, OnInit } from '@tsdi/components';

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
        <app-example></app-example>
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
  selector: 'Field'
})
export class FieldComponet {

  user = 'zhangsan';
  role = 'admin';
  
  // 简洁模式：指定依赖和缓存策略
  @Computed(['user', 'role'], true)
  get fullName() { return `${this.user} (${this.role})`; }

  // 完整模式：指定元数据对象
  @Computed({
    dependencies: ['user', 'role'],
    cache: true,
    // getter: `{{this.user}} {{this.role}}`
    compute: (inst: FieldComponet) => `${inst.user} ${inst.role}`
  })
  fullName1: string | undefined;

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
  template: `
      <div>
        <h1>{{ title }}</h1>
        <p>Count: {{ count }}</p>
        <input v-model="value" />
        <p>Value: {{ value }}</p>
        <button @click="increment">Increment</button>
        <button @click="clickWithData($event, item)">Increment</button>
        <p>Today: {{ today | date-format:'yyyy-MM-dd' }}</p>
      </div>
    `,
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


// @Component({
//   selector: 'app-comp2',
//   template: {
//     '#text': '123',
//     a: '123',
//     b: '456',
//     c: '789',
//     childNodes:[
//       { $tag: 'Text', a: '123'},  
//       { $tag: 'Text', a: '456'},
//       { $tag: 'Text', a: '789'},
//       { $tag: 'Field', a: '123'},
//     ]
//   }
// })
// export class AppComponent2 {

// }
