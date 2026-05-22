import { Inject, Injectable } from '@tsdi/ioc';
import { AGENT_OPTIONS } from '../tokens';
import { AgentOptions, defaultAgentOptions } from '../options';
import { AgentRuntime } from '../runtime/AgentRuntime';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentScheduler } from '../scheduler/AgentScheduler';

@Injectable()
export class AgentConsoleViewModel {
    readonly sessionId = 'console';
    input = '';
    title = '';
    messages: AgentMessage[] = [];
    status = 'idle';

    constructor(
        private runtime: AgentRuntime,
        private scheduler: AgentScheduler,
        @Inject(AGENT_OPTIONS, { defaultValue: defaultAgentOptions }) private options: AgentOptions
    ) {
        this.title = this.options.ui?.title ?? defaultAgentOptions.ui!.title!;
    }

    async onInit(): Promise<void> {
        this.messages = await this.runtime.getMessages(this.sessionId);
    }

    async submit(): Promise<void> {
        const value = this.input.trim();
        if (!value) {
            return;
        }
        this.status = 'running';
        await this.runtime.runTurn(this.sessionId, value);
        this.messages = await this.runtime.getMessages(this.sessionId);
        this.input = '';
        this.status = 'idle';
    }

    async schedulePrompt(prompt: string, delayMs: number): Promise<void> {
        await this.scheduler.schedule({
            id: `task-${Date.now()}`,
            sessionId: this.sessionId,
            prompt,
            runAt: Date.now() + delayMs,
            scheduleType: 'once'
        });
    }

    get tasksCount(): number {
        return this.scheduler.getTasks().length;
    }
}
