import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { TypeOrmModule, TypeormOptions, provideTypeOrm } from '@tsdi/typeorm-adapter';
import { AgentAuditLogEntity, AgentMemoryEntity, AgentMessageEntity, AgentScheduledTaskEntity, AgentSessionEntity } from './memory/entities';



@Module({
    imports: [
        TypeOrmModule.withConnection({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            entities: [AgentSessionEntity, AgentMessageEntity, AgentMemoryEntity, AgentScheduledTaskEntity, AgentAuditLogEntity]
        } as TypeormOptions)
    ]
})
export class AgentOrmModule {
    static withConnection(options: TypeormOptions): ModuleWithProviders<AgentOrmModule> {
        return {
            module: AgentOrmModule,
            providers: createAgentOrmProviders(options)
        }
    }
}


function createAgentOrmProviders(options: TypeormOptions): Provider[] {
    options.entities ??= [];
    options.entities.push(AgentSessionEntity, AgentMessageEntity, AgentMemoryEntity, AgentScheduledTaskEntity, AgentAuditLogEntity);
    return provideTypeOrm(options);
}

export function provideAgentOrm(options: TypeormOptions): Provider[] {
    return createAgentOrmProviders(options);
}
