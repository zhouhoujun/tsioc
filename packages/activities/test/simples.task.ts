import { Task, Activity, ActivityContext, Activities } from '../src';
import { IContainer, ContainerToken } from '@tsdi/core';
import { Inject, isString, isFunction, Token } from '@tsdi/ioc';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';
import { Input } from '@tsdi/components';

@Task('stest')
export class SimpleTask extends Activity<string> {
    async execute(ctx: ActivityContext): Promise<string> {
        // console.log('before simple task:', this.name);
        return await Promise.resolve('simple task')
            .then(val => {
                console.log('return simple task:', val);
                return val;
            });
    }

}

@Task('loaddata')
export class LoadData extends Activity<any> {
    @Input() service: Token;
    @Input() action: string;
    @Input() getParams: string | ((ctx: ActivityContext) => any[]);
    @Input() params: any[];
    async execute(ctx: ActivityContext): Promise<any> {
        let service = ctx.getContextValue(this.service);
        if (service && service[this.action]) {

            let params: any[];
            if (this.params && this.params.length) {
                params = this.params;
            } else if (this.getParams) {
                let getFunc = isString(this.getParams) ? ctx.getExector().eval(this.getParams) : this.getParams;
                params = isFunction(getFunc) ? getFunc(ctx) : [];
            }
            return await service[this.action](...params);
        }
    }
}

@Task('setdata')
export class SetData extends Activity<void> {
    @Input() func: string | Function;
    async execute(ctx: ActivityContext): Promise<void> {
        let func = isString(this.func) ? ctx.getExector().eval(this.func) : this.func;
        if (isFunction(func)) {
            func(ctx);
        }
    }
}

@Task('comowork')
export class WorkTask extends Activity<string> {
    async execute(ctx: ActivityContext): Promise<string> {
        // console.log('before simple task:', this.name);
        return await Promise.resolve('component task')
            .then(val => {
                console.log('return component work task:', val);
                return val;
            });
    }

}

@Task({
    deps: [
        WorkTask
    ],
    selector: 'comptest',
    template: [
        { activity: 'if', condition: (ctx) => !!ctx.workflow.args[0], body: [] },
        {
            activity: 'else',
            body: [
                // WorkTask
                {
                    activity: 'switch',
                    switch: (ctx) => ctx.workflow.args.length,
                    cases: [
                        { case: 0, body: [] }
                    ]
                },
                {
                    activity: 'comowork'
                },
                // {
                //     activity: 'setdata',
                //     func: `ctx => ctx.getConext('xxxxx').setResult(ctx.result)`
                // }
            ]
        },
        // {
        //     activity: 'comowork'
        // }
    ]
})
export class SimpleCTask {

}


@Task({
    name: 'test-module',
    deps: [
        ServerActivitiesModule
    ],
    template: [
        {
            name: 'test---task---3',
            activity: 'if',
            condition: ctx => true,
            body: [SimpleTask]
        },
        SimpleCTask
    ]
})
export class TaskModuleTest {
    constructor(@Inject(ContainerToken) container: IContainer) {

    }

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
