import { Activity, Task, Input, Expression, Src } from '@tsdi/activities';
import { NodeActivityContext } from '../core';
import { IContainer, ContainerToken } from '@tsdi/core';
import { Inject } from '@tsdi/ioc';


@Task('test, [test]')
export class TestActivity extends Activity<void> {

    @Input()
    protected test: Expression<Src>;

    constructor(
        @Inject('[test]') test: Expression<Src>,
        @Inject(ContainerToken) container: IContainer) {
        super(container)
        this.test = test;
    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {

    }

}
