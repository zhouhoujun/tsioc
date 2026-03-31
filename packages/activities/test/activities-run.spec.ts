import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext } from '@tsdi/core';
import { Module, Injectable, Injector } from '@tsdi/ioc';
import { Component, ComponentsModule } from '@tsdi/components';
import { Workflow, WorkflowModule, Activity, ActivityContext, ActivityResult } from '../src';


@Component({
    selector: 'hello-activity',
    template: `
        <div>{{message}}</div>
    `
})
class HelloActivity extends Activity {
    name: string = 'World';

    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { message: `Hello ${this.name}!` }
        };
    }
}

@Component({
    selector: 'calc-activity',
    template: `
        <div>Calculator Activity</div>
    `
})
class CalcActivity extends Activity {
    a: number = 0;
    b: number = 0;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { result: this.a + this.b }
        };
    }
}

@Suite('Workflow.run with Activity class directly')
export class WorkflowActivityDirectTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Workflow.run(HelloActivity, {
            renderer: 'xml'
        });
    }

    @Test('should bootstrap Activity directly')
    async testBootstrap() {
        expect(this.ctx).toBeDefined();
    }

    @Test('should get HelloActivity via runners.getRef')
    async testGetActivity() {
        const ref = this.ctx.runners.getRef(HelloActivity);
        expect(ref).toBeDefined();
    }

    @Test('should have HelloActivity properties')
    async testActivityProps() {
        const ref = this.ctx.runners.getRef(HelloActivity);
        expect(ref.instance.name).toBe('World');
    }

    @After()
    async destroy() {
        if (this.ctx && !this.ctx.destroyed) {
            await this.ctx.destroy();
        }
    }
}

@Suite('Workflow.run with CalcActivity directly')
export class WorkflowCalcActivityTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Workflow.run(CalcActivity, {
            renderer: 'xml'
        });
    }

    @Test('should bootstrap CalcActivity directly')
    async testBootstrap() {
        expect(this.ctx).toBeDefined();
    }

    @Test('should get CalcActivity via runners.getRef')
    async testGetActivity() {
        const ref = this.ctx.runners.getRef(CalcActivity);
        expect(ref).toBeDefined();
    }

    @After()
    async destroy() {
        if (this.ctx && !this.ctx.destroyed) {
            await this.ctx.destroy();
        }
    }
}
