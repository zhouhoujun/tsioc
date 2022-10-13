import { Inject, isString, isFunction, Token, InvocationContext } from '@tsdi/ioc';
import { AfterViewInit, Component, Directive, EventEmitter, Input, OnInit, Output } from '@tsdi/components';

@Component({
    selector: 'stest',
    template: `
        <assign [value]="text"></assign>
    `}
)
export class SimpleTask implements OnInit, AfterViewInit {

    @Input() text!: string;

    @Output() textChange = new EventEmitter<string>();

    onInit(): void {
        this.text = 'simple task';
        this.textChange.emit(this.text);
    }
    onAfterViewInit(): void {
        console.log('return simple task:', this.text);
    }

}

@Directive('[loaddata]')
export class LoadData implements OnInit {
    @Input() service?: Token;
    @Input() action?: string;
    @Input() params?: any[];

    @Output() loaddata = new EventEmitter<any>();

    constructor(private ctx: InvocationContext) {

    }

    onInit(): void {
        this.invokeService();
    }

    async invokeService(): Promise<any> {
        const ctx = this.ctx;
        const service = ctx.get(this.service!);
        if (service && service[this.action!]) {

            let params: any[];
            if (this.params) {
                params = this.params;
            } else {
                params = [];
            }
            const data = await service[this.action!](...params);
            this.loaddata.emit(data);
        }
    }
}


@Component({
    selector: 'comowork',
    template: `
    `
})
export class WorkTask implements AfterViewInit {
    public text!: string;

    @Output() textChange = new EventEmitter<string>();

    onInit(): void {
        this.text = 'component task';
        this.textChange.emit(this.text);
    }

    onAfterViewInit(): void {
        console.log('return component work task:', this.text);
    }

}

@Component({
    selector: 'comptest',
    template: `
        <activity *if="arg; else elseBlock"></activity>
        <template #elseBlock>
            <activity [switch]="args?.length">
                <assign *case="0" [value]="a"></assign>
            </activity>
            <comowork (textChange)="textChange($event)"></comowork>
        <template>
    `
    // template: [
    //     { activity: Activities.if, condition: (ctx) => !!ctx.workflow.args[0], body: [] },
    //     {
    //         activity: Activities.else,
    //         body: [
    //             // WorkTask
    //             {
    //                 activity: Activities.switch,
    //                 switch: (ctx) => ctx.workflow.args.length,
    //                 cases: [
    //                     { case: 0, body: [] }
    //                 ]
    //             },
    //             {
    //                 activity: 'comowork'
    //             },
    //             // {
    //             //     activity: 'setdata',
    //             //     func: `ctx => ctx.getConext('xxxxx').setResult(ctx.result)`
    //             // }
    //         ]
    //     },
    //     // {
    //     //     activity: 'comowork'
    //     // }
    // ]
})
export class SimpleCTask implements OnInit {

    public arg: any;

    public text!: string;


    @Output() valueChange = new EventEmitter<string>();

    textChange(value: string) {
        this.text = value;
        this.valueChange.emit(value);

    }

    onInit(): void {
        
    }


}


@Component({
    selector: 'test-module',
    template: `
        <stest *if="condition" (textChange)="text = $event"></stest>
        <comptest *if="!condition" (valueChange)="text = $event"></comptest>
    `
    // template: [
    //     {
    //         name: 'test---task---3',
    //         activity: 'if',
    //         condition: () => true,
    //         body: [SimpleTask]
    //     },
    //     SimpleCTask
    // ]
})
export class TaskModuleTest implements OnInit {
    onInit(): void {
        this.condition = true;
    }
    public text!: string;

    condition?: boolean;

}



// async function test() {

//     let container = new Worflow(__dirname);

//     // container.use({ modules: [SimpleTask] });
//     await container.bootstrap(SimpleTask);


//     console.log('\n------------SimpleTask------------------');
//     let container2 = new Worflow(__dirname);
//     await container2.use(SimpleTask)
//         .bootstrap('test');

//     console.log('\n-----------SimpleCTask-------------------');
//     await Workflow.create( SimpleCTask)
//         .bootstrap('comptest');


//     console.log('\n-----------Custome Component-------------------');
//     await Workflow.create()
//         .bootstrap({
//             providers: {
//                 name: 'test1'
//             },
//             task: TaskElement,
//             children: [
//                 {
//                     providers: { name: 'test------1' },
//                     task: SimpleTask
//                 },
//                 {
//                     providers: { name: 'test------2' },
//                     task: SimpleCTask
//                 }
//             ]
//         });

//     console.log('\n-------------Component Module-----------------');
//     await Workflow.create()
//         .bootstrap(TaskModuleTest);
// }

// test();
