import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AgentSessionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    sessionId!: string;

    @Column({ type: 'text', nullable: true })
    summary!: string;

    @Column({ type: 'bigint' })
    updatedAt!: number;
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

    @Column({ type: 'bigint' })
    createdAt!: number;
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
}
