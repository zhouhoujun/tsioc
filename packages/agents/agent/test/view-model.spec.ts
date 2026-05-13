import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleViewModel } from '../src/ui/AgentConsoleViewModel';

class RuntimeStub {
    calls: string[] = [];
    messages = [{ id: '1', role: 'assistant', content: 'ready', createdAt: 1 } as any];

    async runTurn(sessionId: string, input: string): Promise<any> {
        this.calls.push(`${sessionId}:${input}`);
        this.messages = [
            { id: '1', role: 'user', content: input, createdAt: 1 },
            { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
        ] as any;
        return { sessionId, message: this.messages[1] };
    }

    async getMessages(): Promise<any[]> {
        return this.messages;
    }
}

class SchedulerStub {
    tasks: any[] = [];

    async schedule(task: any): Promise<any> {
        this.tasks.push(task);
        return task;
    }

    getTasks(): any[] {
        return this.tasks;
    }
}

@Suite('Agent console view model')
export class AgentConsoleViewModelTest {
    @Test('submit updates messages and clears input')
    async submitUpdatesState() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const vm = new AgentConsoleViewModel(runtime as any, scheduler as any, { ui: { title: 'Console' } } as any);
        vm.input = 'hello';
        await vm.submit();
        expect(runtime.calls).toEqual(['console:hello']);
        expect(vm.messages.length).toEqual(2);
        expect(vm.messages[1].content).toEqual('Echo: hello');
        expect(vm.input).toEqual('');
        expect(vm.status).toEqual('idle');
    }

    @Test('schedulePrompt adds task and updates tasks count')
    async schedulePromptAddsTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const vm = new AgentConsoleViewModel(runtime as any, scheduler as any, { ui: { title: 'Console' } } as any);
        await vm.schedulePrompt('later', 100);
        expect(vm.tasksCount).toEqual(1);
        expect(scheduler.tasks[0].prompt).toEqual('later');
        expect(scheduler.tasks[0].sessionId).toEqual('console');
    }
}
