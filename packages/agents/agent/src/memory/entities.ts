import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AgentSessionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    sessionId!: string;

    @Column({ type: 'text', nullable: true })
    summary!: string;

    @Column({ type: 'text', nullable: true })
    ownerPrincipalId!: string | null;

    @Column({ type: 'bigint' })
    createdAt!: number;

    @Column({ type: 'bigint' })
    updatedAt!: number;
}

@Entity()
export class AgentMessageEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    sessionId!: string;

    @Column()
    messageId!: string;

    @Column({ type: 'int' })
    sequence!: number;

    @Column()
    role!: string;

    @Column({ type: 'text' })
    content!: string;

    @Column({ nullable: true })
    name!: string;

    @Column({ nullable: true })
    toolCallId!: string;

    @Column({ type: 'simple-json', nullable: true })
    metadata!: Record<string, any>;

    @Column({ type: 'bigint' })
    createdAt!: number;
}

@Entity()
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

@Entity()
export class AgentScheduledTaskEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    sessionId!: string;

    @Column({ type: 'text' })
    prompt!: string;

    @Column({ type: 'bigint', nullable: true })
    runAt!: number;

    @Column({ type: 'int', nullable: true })
    intervalMs!: number;

    @Column({ type: 'text', nullable: true })
    cronExpr!: string | null;

    @Column({ type: 'varchar', nullable: true })
    scheduleType!: string | null;

    @Column({ type: 'boolean', default: false })
    cancelled!: boolean;

    @Column({ type: 'boolean', default: false })
    running!: boolean;

    @Column({ type: 'bigint', nullable: true })
    createdAt!: number;

    @Column({ type: 'bigint', nullable: true })
    updatedAt!: number;

    @Column({ type: 'bigint', nullable: true })
    lastRunAt!: number;

    @Column({ type: 'bigint', nullable: true })
    nextRunAt!: number;

    @Column({ type: 'int', default: 0 })
    runCount!: number;

    @Column({ type: 'int', default: 0 })
    failureCount!: number;

    @Column({ type: 'text', nullable: true })
    lastError!: string;
}
