import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { TypeOrmModule, TypeormOptions } from '@tsdi/typeorm-adapter';
import { AgentMemoryEntity, AgentScheduledTaskEntity, AgentSessionEntity } from '../memory/entities';

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
export class HermesOrmModule {
    static withConnection(options: TypeormOptions): ModuleWithProviders<TypeOrmModule> {
        return TypeOrmModule.withConnection({
            ...options,
            entities: [...(options.entities ?? []), AgentSessionEntity, AgentMemoryEntity, AgentScheduledTaskEntity]
        });
    }
}
