import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
// Memory reads are session-scoped (`getAll(sessionId)` on every todo/memory
// query). Without an index SQLite scanned the whole table and sorted it, so
// the console's project aggregation spent ~60ms per session.
@Index('idx_agent_memory_session', ['sessionId'])
@Index('idx_agent_memory_scope', ['scope'])
export class AgentMemoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ nullable: true })
    sessionId!: string;

    @Column()
    key!: string;

    @Column({ type: 'text' })
    value!: string;

    @Column()
    scope!: string;

    @Column({ nullable: true })
    namespace!: string;

    @Column({ nullable: true })
    category!: string;

    @Column({ type: 'simple-json', nullable: true })
    metadata!: Record<string, any>;

    @Column({ type: 'bigint' })
    createdAt!: number;

    @Column({ type: 'bigint', nullable: true })
    updatedAt!: number;
}

