import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Cross-process turn lease per session; expired leases are reclaimable. */
@Entity('agent_session_lease')
export class AgentSessionLeaseEntity {
    @PrimaryColumn()
    sessionId!: string;

    @Column()
    ownerId!: string;

    @Column({ type: 'bigint' })
    leaseUntil!: number;

    @Column({ type: 'bigint' })
    updatedAt!: number;
}
