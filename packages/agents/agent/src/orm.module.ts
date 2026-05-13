import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { TypeOrmModule, TypeormOptions, provideTypeOrm } from '@tsdi/typeorm-adapter';
import { AgentMemoryEntity, AgentScheduledTaskEntity, AgentSessionEntity } from './memory/entities';



@Module({
    imports: [
        TypeOrmModule.withConnection({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            entities: [AgentSessionEntity, AgentMemoryEntity, AgentScheduledTaskEntity]
        } as TypeormOptions)
    ]
})
export class AgentOrmModule {
    static withConnection(options: TypeormOptions): ModuleWithProviders<AgentOrmModule> {
        return {
            module: AgentOrmModule,
            providers: provideAgentOrm(options)
        }
    }
}


export function provideAgentOrm(options: TypeormOptions): Provider[] {
    options.entities ??= [];
    options.entities.push(AgentSessionEntity, AgentMemoryEntity, AgentScheduledTaskEntity);
    return provideTypeOrm(options);
}
