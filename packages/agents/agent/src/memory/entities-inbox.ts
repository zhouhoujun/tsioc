import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Durable per-session input queue (queue vs steer). Rows are replaced as one
 * ordered batch by the UI/runtime; `seq` preserves promotion order.
 */
@Entity('agent_session_inbox')
@Index(['sessionId', 'itemId'], { unique: true })
export class AgentSessionInboxEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    sessionId!: string;

    @Column()
    itemId!: string;

    @Column()
    kind!: string;

    @Column({ type: 'simple-json' })
    payload!: Record<string, any>;

    @Column({ default: 'queued' })
    state!: string;

    @Column({ type: 'bigint' })
    seq!: number;

    @Column({ type: 'bigint' })
    createdAt!: number;

    @Column({ type: 'bigint' })
    updatedAt!: number;
}
