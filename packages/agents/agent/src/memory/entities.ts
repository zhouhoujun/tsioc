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

    @Column({ type: 'text', nullable: true })
    workspace!: string | null;

    @Column({ type: 'text', nullable: true })
    projectId!: string | null;

    @Column({ type: 'text', nullable: true })
    primaryThreadId!: string | null;

    @Column({ type: 'text', nullable: true })
    sessionRole!: string | null;

    @Column({ type: 'text', nullable: true })
    rootRequest!: string | null;

    @Column({ type: 'text', nullable: true })
    focusSummary!: string | null;

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
    metadata!: Record<string, any> | null;

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
    paused!: boolean;

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

    @Column({ type: 'int', nullable: true })
    maxAttempts!: number | null;

    @Column({ type: 'bigint', nullable: true })
    retryBackoffMs!: number | null;

    @Column({ type: 'float', nullable: true })
    retryBackoffMultiplier!: number | null;

    @Column({ type: 'boolean', default: false })
    manualRecoveryRequired!: boolean;

    @Column({ type: 'boolean', default: false })
    alertOnFailure!: boolean;
}

@Entity()
export class AgentAuditLogEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    sessionId!: string;

    @Column()
    toolName!: string;

    @Column()
    toolCallId!: string;

    @Column({ type: 'varchar' })
    status!: string;

    @Column({ type: 'text', nullable: true })
    inputSummary!: string | null;

    @Column({ type: 'text', nullable: true })
    outputSummary!: string | null;

    @Column({ type: 'text', nullable: true })
    error!: string | null;

    @Column({ type: 'bigint', nullable: true })
    durationMs!: number | null;

    @Column({ type: 'int', nullable: true })
    attemptCount!: number | null;

    @Column({ type: 'text', nullable: true })
    principalId!: string | null;

    @Column({ type: 'simple-json', nullable: true })
    metadata!: Record<string, any> | null;

    @Column({ type: 'bigint' })
    createdAt!: number;
}

@Entity()
export class AgentCompactionHistoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    sessionId!: string;

    @Column({ type: 'varchar' })
    strategy!: string;

    @Column()
    compactionTriggered!: boolean;

    @Column({ type: 'varchar' })
    level!: string;

    @Column()
    summaryInserted!: boolean;

    @Column({ type: 'int' })
    beforeMessageCount!: number;

    @Column({ type: 'int' })
    afterMessageCount!: number;

    @Column({ type: 'int' })
    beforeTokens!: number;

    @Column({ type: 'int' })
    afterTokens!: number;

    @Column({ type: 'int' })
    compactedMessageCount!: number;

    @Column({ type: 'int' })
    preservedAnchorCount!: number;

    @Column({ type: 'int' })
    recentMessageCount!: number;

    @Column({ type: 'int' })
    prunedMessageCount!: number;

    @Column({ type: 'int' })
    toolMessagesCompacted!: number;

    @Column({ type: 'int' })
    compressionRatio!: number;

    @Column({ type: 'int' })
    cumulativeTokenSavings!: number;

    @Column({ type: 'simple-json', nullable: true })
    metadata!: Record<string, any> | null;

    @Column({ type: 'bigint' })
    createdAt!: number;
}

@Entity()
export class AgentTurnDiagnosticsEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    sessionId!: string;

    @Column({ type: 'bigint' })
    createdAt!: number;

    @Column({ type: 'int' })
    emptyResponseRetryCount!: number;

    @Column({ type: 'int' })
    followUpRecoveryCount!: number;

    @Column()
    followUpContextRewritten!: boolean;

    @Column()
    finalAssistantWasClarification!: boolean;

    @Column()
    repeatedClarificationDetected!: boolean;

    @Column({ type: 'int' })
    compactionCount!: number;

    @Column({ type: 'int' })
    totalTokenSavings!: number;

    @Column({ type: 'int', nullable: true })
    compressionRatio!: number | null;

    @Column({ type: 'varchar', nullable: true })
    compactionLevel!: string | null;

    @Column({ type: 'simple-json', nullable: true })
    promptCache!: Record<string, any> | null;

    @Column({ type: 'simple-json', nullable: true })
    metadata!: Record<string, any> | null;
}

@Entity()
export class AgentDelegationEdgeEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    parentSessionId!: string;

    @Column()
    childSessionId!: string;

    @Column({ type: 'varchar', nullable: true })
    kind!: string | null;

    @Column({ type: 'varchar' })
    status!: string;

    @Column({ type: 'bigint' })
    createdAt!: number;

    @Column({ type: 'bigint', nullable: true })
    completedAt!: number | null;

    @Column({ type: 'simple-json', nullable: true })
    metadata!: Record<string, any> | null;
}

@Entity()
export class AgentSummaryQualityEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    provider!: string;

    @Column({ type: 'varchar', nullable: true })
    model!: string | null;

    @Column({ type: 'int' })
    total!: number;

    @Column({ type: 'int' })
    fieldCompleteness!: number;

    @Column({ type: 'int' })
    annotationQuality!: number;

    @Column({ type: 'int' })
    lengthBalance!: number;

    @Column({ type: 'int' })
    truncationScore!: number;

    @Column()
    fallbackUsed!: boolean;

    @Column({ type: 'int' })
    summaryLength!: number;

    @Column({ type: 'bigint' })
    createdAt!: number;

    @Column({ type: 'simple-json', nullable: true })
    metadata!: Record<string, any> | null;
}
