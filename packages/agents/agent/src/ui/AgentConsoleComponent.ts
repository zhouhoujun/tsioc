import { Component } from '@tsdi/components';
import { AgentConsoleViewModel } from './AgentConsoleViewModel';
import { AgentMessage } from '../runtime/AgentMessage';

@Component({
    selector: 'agent-console',
    template: `
    <div class="agent-console">
        <h1>{{title}}</h1>
        <p class="status">Status: {{status}}</p>
        <p class="tasks">Tasks: {{tasksCount}}</p>
        <input class="agent-input" v-model="input" />
        <button class="send-btn" @click="submit">Send</button>
        <div class="messages">
            <p v-for="message in messages" class="message-item">{{message.role}}: {{message.content}}</p>
        </div>
    </div>
    `
})
export class AgentConsoleComponent {
    input = '';

    constructor(private vm: AgentConsoleViewModel) {
    }

    get title(): string {
        return this.vm.title;
    }

    get status(): string {
        return this.vm.status;
    }

    get tasksCount(): number {
        return this.vm.tasksCount;
    }

    get messages(): AgentMessage[] {
        return this.vm.messages;
    }

    async onInit(): Promise<void> {
        await this.vm.onInit();
    }

    async submit(): Promise<void> {
        this.vm.input = this.input;
        await this.vm.submit();
        this.input = this.vm.input;
    }
}
