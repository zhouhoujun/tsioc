import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext } from '@tsdi/core';
import { Module, Injectable, Injector } from '@tsdi/ioc';
import { Workflow, WorkflowModule } from '../src';
import { ComponentsModule } from '@tsdi/components';


@Injectable()
class TestService {
    getName() {
        return 'test-service';
    }
}

@Module({
    providers: [TestService]
})
class TestActivityModule {
}

@Suite('Activities.run test')
export class ActivitiesRunTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Workflow.run(TestActivityModule, {
        });
    }

    @Test('should run activity with deps')
    async testRunWithDeps() {
        expect(this.ctx).toBeDefined();
    }

    @Test('should have WorkflowModule loaded via platformDeps')
    async testWorkflowModuleLoaded() {
        const injector = this.ctx as any as Injector;
        const hasWorkflow = injector.has(WorkflowModule);
        expect(hasWorkflow).toBeTruthy();
    }

    @Test('should have TestService available')
    async testServiceAvailable() {
        const injector = this.ctx as any as Injector;
        const service = injector.get(TestService);
        expect(service).toBeDefined();
        expect(service.getName()).toBe('test-service');
    }

    @After()
    async destroy() {
        if (this.ctx && !this.ctx.destroyed) {
            await this.ctx.destroy();
        }
    }
}

@Suite('Workflow.run test')
export class WorkflowRunTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        const { Workflow } = await import('../src');
        this.ctx = await Workflow.run(TestActivityModule, {
            deps: [
                ComponentsModule
            ]
        });
    }

    @Test('should run workflow with auto-added WorkflowModule')
    async testWorkflowRun() {
        expect(this.ctx).toBeDefined();
    }

    @Test('should have WorkflowModule as platform dep')
    async testPlatformDeps() {
        const injector = this.ctx as any as Injector;
        const hasWorkflow = injector.has(WorkflowModule);
        expect(hasWorkflow).toBeTruthy();
    }

    @Test('should have TestService available in workflow')
    async testServiceInWorkflow() {
        const injector = this.ctx as any as Injector;
        const service = injector.get(TestService);
        expect(service).toBeDefined();
        expect(service.getName()).toBe('test-service');
    }

    @After()
    async destroy() {
        if (this.ctx && !this.ctx.destroyed) {
            await this.ctx.destroy();
        }
    }
}

