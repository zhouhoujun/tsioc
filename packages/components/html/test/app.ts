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
  }

  handleClick() {
    this.status = 'Clicked!';
  }
}



@Component({
  selector: 'Field',
  template: `<p>
        <span>{{label}}:</span><input v-model="value"/>
    </p>
    <p>
      {{fullName}} / {{fullName1}}
    </p>
    `
})
export class FieldComponet {

  user = 'zhangsan';
  role = 'admin';
  
  @Computed(['user', 'role'], true)
  get fullName() { return `${this.user} (${this.role})`; }

  @Computed({
    dependencies: ['user', 'role'],
    cache: true,
    compute: (inst: FieldComponet) => `${inst.user} ${inst.role}`
  })
  fullName1 = '';

  @Attribute() label = '';
  @Attribute() value =  '';

}


@Component({
  selector: 'Text',
  template: '<span>{{text}}</span>'
})
export class TextComponet {
  @Attribute() text = '';
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


@Component({
  selector: 'app-comp',
  imports: [TextComponet, FieldComponet],
  template: `
        <Text [text]="'Well come'"></Text>
        <Field #fie [label]="label" [(value)]="value"></Field>
        <app-example></app-example>
    `
})
export class AppComponent2 implements OnInit {
  onInit(): void {
  }
  label?: string;
  value?: string;
}


@Component({
  selector: 'complex-component',
  imports:[
    FieldComponet,
    TextComponet
  ],
  template: `
    <div class="complex-container">
      <h2>{{ title }}</h2>
      <div class="nested-components">
        <Text text="Nested Text Component"></Text>
        <Field label="Nested Field" value="Nested Value"></Field>
      </div>
      <div class="dynamic-content">
        <div v-for="item in items" :key="item.id">
          <p>{{ item.name }}: {{ item.value }}</p>
        </div>
      </div>
      <div class="conditional-content">
        <p v-if="showConditional">This is conditional content</p>
        <p v-else-if="showConditional2">This is conditional2 content</p>
        <p v-else>This is the alternate content</p>
      </div>
      <div class="switch-content" v-switch='switchLable'>
        <p v-case="'Case 1'">This is case 1 content</p>
        <p v-case="'Case 2'">This is case 2 content</p>
      </div>
      <button @click="toggleConditional">Toggle Content</button>
    </div>
  `
})
export class ComplexComponent implements OnInit {
  title = 'Complex Test Component';
  showConditional = false;
  showConditional2 = false;
  switchLable= 'Case 2';
  items = [
    { id: 1, name: 'Item 1', value: 'Value 1' },
    { id: 2, name: 'Item 2', value: 'Value 2' },
    { id: 3, name: 'Item 3', value: 'Value 3' }
  ];

  onInit() {
    console.log('ComplexComponent initialized');
  }

  toggleConditional() {
    this.showConditional = !this.showConditional;
  }
}

@Component({
  selector: 'svg-component',
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect x="10" y="10" width="180" height="180" fill="blue" />
      <circle cx="100" cy="100" r="50" fill="red" />
      <text x="100" y="105" text-anchor="middle" fill="white">SVG Test</text>
    </svg>
  `
})
export class SvgComponent {
}