import { DIModule } from '@tsdi/boot';
import { Attribute, CompilerFacade, Component, Directive, ElementRef, EventEmitter, HostMapping, Input, OnInit, Output, ViewChild, ViewChildren, ViewRef } from '@tsdi/components';
import { Inject, Injectable, Injector } from '@tsdi/ioc';


@Directive('Text, [Text]')
export class TextDirective {
    @Input() name: string;

    // @Input() text: string;
    // @Output() textChange: EventEmitter<string> = new EventEmitter();

    @Attribute() text: string;
}


@Directive('Input, [Input]')
export class InputDirective {
    @Input() name: string;
    @Input() value: string;
    @Output() valueChange: EventEmitter<string> = new EventEmitter();
}

@Directive('Container')
export class ContainerDirective {

    @Attribute() name: string;

    @ViewChildren() contents: ViewRef[];
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
        <comp></comp>
    `
})
@HostMapping()
export class AppComponent implements OnInit {

    label: string;
    value: string;

    @ViewChild('fie') cmp1: FieldComponent;

    onInit(): void {
        this.label = 'name';
        this.value = '';
    }

    @HostMapping('/getData', 'post')
    message(lable: string, vaule: string) {
        this.label = lable;
        this.value = vaule;
    }
}


@Directive('selector1, [selector1]')
export class Selector1 {
    @Attribute() id: string;
    @Attribute() name: string;
}

@Directive('selector3, [selector3]')
export class Selector3 extends Selector1 {
    @Attribute() address: string;
    @Attribute() phone: string;
}

@Injectable()
class CustomeService {

    @Inject()
    injector: Injector;

    createComponent3() {
        // console.log(this.container.resolve(BuildHandleRegisterer));
        return this.injector.get(CompilerFacade).compileTemplate({ template: { element: 'selector3', name: 'test3', address: 'address3', phone: '+86177000000010' }, injector: this.injector })
    }
}


@HostMapping()
@Component({
    selector: 'comp',
    template: `
        <selector1 #se1 [(name)]="name"></selector1>
        <selector3 #se3 [(name)]="name" [address]="address"></selector3>
    `
})
export class Components {
    name: string;
    address: string;

    @ViewChild('se1') se1: ElementRef<Selector1>;
    @ViewChild('se3') se3: ElementRef<Selector1>;

    @HostMapping('/address', 'post')
    updateAddress(name: string, address: string) {
        this.name = name;
        this.address = address;
    }

}


@DIModule({
    providers: [
        CustomeService
    ],
    declarations: [
        Selector1,
        Selector3,
        Components
    ],
    exports: [
        Selector1,
        Selector3,
        Components
    ]
})
export class SubModule {

}

@DIModule({
    imports:[
        SubModule
    ],
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