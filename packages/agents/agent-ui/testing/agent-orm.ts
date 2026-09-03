import { Application, ApplicationContext } from '@tsdi/core';
import { AgentModule, provideAgentOrm } from '@tsdi/agent';

export function runAgentUiOrmApp(): Promise<ApplicationContext> {
    return Application.run({
        module: AgentModule,
        providers: [
            ...provideAgentOrm({
                type: 'sqljs' as any,
                autoLoadEntities: false as any,
                synchronize: true,
                autoSave: false,
                entities: []
            } as any)
        ]
    });
}
