import { DIModule } from '@tsdi/boot';
import { Component, Directive, EventEmitter, Input, OnInit, Output, ViewChild, ViewChildren, ViewRef } from '@tsdi/components';


@Directive('Text, [Text]')
export class TextDirective {
    @Input() name: string;
    @Input() text: string;
    @Output() valueChange: EventEmitter<string> = new EventEmitter();
}


@Directive('Input, [Input]')
export class InputDirective {
    @Input() name: string;
    @Input() value: string;
    @Output() valueChange: EventEmitter<string> = new EventEmitter();
}

@Directive('Container')
export class ContainerDirective {
    @ViewChildren() contents: ViewRef[]
}

@Component({
    selector: 'Field',
    template: `<Container>
        <Text [text]="label"></Text>
        <Input [(value)]="value" ></Input>
    </Container>`
})
export class FieldComponent {
    @Input() label: string;
    @Input() value: any;
}


@Component({
    selector: 'app-comp',
    template: `
        <Text [text]="'Well come'"></Text>
        <Field #fie [label]="label" [(value)]="value"></Field>
    `
})
export class AppComponent implements OnInit {

    label: string;
    value: string;

    @ViewChild('fie') cmp1: FieldComponent;

    onInit(): void {
        this.label = 'name';
        this.value = '';
    }

}

@DIModule({
    declarations: [
        Text,
        ContainerDirective,
        FieldComponent,
        AppComponent
    ],
    bootstrap: AppComponent
})
export class TestModule {

}