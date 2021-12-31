import * as tls from 'tls';
import * as net from 'net';
import { Deserializer, TransportResponse, Serializer } from '@tsdi/core';
import { isNil, isObject, isPlainObject, isString, isUndefined } from '@tsdi/ioc';

export interface KafkaRequest<T = any> {
    key: Buffer | string | null;
    value: T;
    headers: Record<string, any>;
}

export class KafkaRequestSerializer implements Serializer<any, KafkaRequest> {
    serialize(value: any): KafkaRequest {
        const isNotKafkaMessage =
            isNil(value) ||
            !isObject(value) ||
            (!('key' in value) && !('value' in value));

        if (isNotKafkaMessage) {
            value = { value };
        }
        value.value = this.encode(value.value);
        if (!isNil(value.key)) {
            value.key = this.encode(value.key);
        }
        if (isNil(value.headers)) {
            value.headers = {};
        }
        return value;
    }

    public encode(value: any): Buffer | string | null {
        const isObjectOrArray =
            !isNil(value) && !isString(value) && !Buffer.isBuffer(value);

        if (isObjectOrArray) {
            return isPlainObject(value) || Array.isArray(value)
                ? JSON.stringify(value)
                : value.toString();
        } else if (isUndefined(value)) {
            return null;
        }
        return value;
    }
}


export class KafkaResponseDeserializer implements Deserializer<any, TransportResponse> {
    deserialize(message: any, options?: Record<string, any>): TransportResponse {
        const id = message.headers[KafkaHeaders.CORRELATION_ID].toString();
        if (!isUndefined(message.headers[KafkaHeaders.NEST_ERR])) {
            return {
                id,
                err: message.headers[KafkaHeaders.NEST_ERR],
                disposed: true,
            };
        }
        if (!isUndefined(message.headers[KafkaHeaders.NEST_IS_DISPOSED])) {
            return {
                id,
                response: message.value,
                disposed: true,
            };
        }
        return {
            id,
            response: message.value,
            disposed: false,
        };
    }
}


export class KafkaParser {

    constructor(readonly keepBinary: boolean = false) {
    }

    public parse<T = any>(data: any): T {
        if (!this.keepBinary) {
            data.value = this.decode(data.value);
        }

        if (!isNil(data.key)) {
            data.key = this.decode(data.key);
        }
        if (!isNil(data.headers)) {
            const decodeHeaderByKey = (key: string) => {
                data.headers[key] = this.decode(data.headers[key]);
            };
            Object.keys(data.headers).forEach(decodeHeaderByKey);
        } else {
            data.headers = {};
        }
        return data;
    }

    public decode(value: Buffer): object | string | null | Buffer {
        if (isNil(value)) {
            return null;
        }
        // A value with the "leading zero byte" indicates the schema payload.
        // The "content" is possibly binary and should not be touched & parsed.
        if (
            Buffer.isBuffer(value) &&
            value.length > 0 &&
            value.readUInt8(0) === 0
        ) {
            return value;
        }

        let result = value.toString();
        const startChar = result.charAt(0);

        // only try to parse objects and arrays
        if (startChar === '{' || startChar === '[') {
            try {
                result = JSON.parse(value.toString());
            } catch (e) { }
        }
        return result;
    }
}

export class InvalidKafkaClientTopicError extends Error {
    constructor(topic?: string) {
        super(
            `The client consumer did not subscribe to the corresponding reply topic (${topic}).`,
        );
        Object.setPrototypeOf(this, InvalidKafkaClientTopicError.prototype);
        Error.captureStackTrace(this);
    }
}

export const DEFAULT_BROKERS = ['localhost:9092'];

/**
 * @see https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/KafkaHeaders.html
 */
export enum KafkaHeaders {
    ACKNOWLEDGMENT = 'kafka_acknowledgment',
    BATCH_CONVERTED_HEADERS = 'kafka_batchConvertedHeaders',
    CONSUMER = 'kafka_consumer',
    CORRELATION_ID = 'kafka_correlationId',
    DELIVERY_ATTEMPT = 'kafka_deliveryAttempt',
    DLT_EXCEPTION_FQCN = 'kafka_dlt-exception-fqcn',
    DLT_EXCEPTION_MESSAGE = 'kafka_dlt-exception-message',
    DLT_EXCEPTION_STACKTRACE = 'kafka_dlt-exception-stacktrace',
    DLT_ORIGINAL_OFFSET = 'kafka_dlt-original-offset',
    DLT_ORIGINAL_PARTITION = 'kafka_dlt-original-partition',
    DLT_ORIGINAL_TIMESTAMP = 'kafka_dlt-original-timestamp',
    DLT_ORIGINAL_TIMESTAMP_TYPE = 'kafka_dlt-original-timestamp-type',
    DLT_ORIGINAL_TOPIC = 'kafka_dlt-original-topic',
    GROUP_ID = 'kafka_groupId',
    MESSAGE_KEY = 'kafka_messageKey',
    NATIVE_HEADERS = 'kafka_nativeHeaders',
    OFFSET = 'kafka_offset',
    PARTITION_ID = 'kafka_partitionId',
    PREFIX = 'kafka_',
    RAW_DATA = 'kafka_data',
    RECEIVED = 'kafka_received',
    RECEIVED_MESSAGE_KEY = 'kafka_receivedMessageKey',
    RECEIVED_PARTITION_ID = 'kafka_receivedPartitionId',
    RECEIVED_TIMESTAMP = 'kafka_receivedTimestamp',
    RECEIVED_TOPIC = 'kafka_receivedTopic',
    RECORD_METADATA = 'kafka_recordMetadata',
    REPLY_PARTITION = 'kafka_replyPartition',
    REPLY_TOPIC = 'kafka_replyTopic',
    TIMESTAMP = 'kafka_timestamp',
    TIMESTAMP_TYPE = 'kafka_timestampType',
    TOPIC = 'kafka_topic',

    // framework specific headers
    NEST_ERR = 'kafka_nest-err',
    NEST_IS_DISPOSED = 'kafka_nest-is-disposed',
}


type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U

export declare class Kafka {
    constructor(config: KafkaConfig)
    producer(config?: ProducerConfig): Producer
    consumer(config?: ConsumerConfig): Consumer
    admin(config?: AdminConfig): Admin
    logger(): Logger
}

export type BrokersFunction = () => string[] | Promise<string[]>

export interface KafkaConfig {
    brokers: string[] | BrokersFunction
    ssl?: tls.ConnectionOptions | boolean
    sasl?: SASLOptions
    clientId?: string
    connectionTimeout?: number
    authenticationTimeout?: number
    reauthenticationThreshold?: number
    requestTimeout?: number
    enforceRequestTimeout?: boolean
    retry?: RetryOptions
    socketFactory?: ISocketFactory
    logLevel?: logLevel
    logCreator?: logCreator
}

export interface ISocketFactoryArgs {
    host: string,
    port: number,
    ssl: tls.ConnectionOptions,
    onConnect: () => void
}

export type ISocketFactory = (args: ISocketFactoryArgs) => net.Socket

export interface OauthbearerProviderResponse {
    value: string
}

type SASLMechanismOptionsMap = {
    'plain': { username: string, password: string },
    'scram-sha-256': { username: string, password: string },
    'scram-sha-512': { username: string, password: string },
    'aws': { authorizationIdentity: string, accessKeyId: string, secretAccessKey: string, sessionToken?: string },
    'oauthbearer': { oauthBearerProvider: () => Promise<OauthbearerProviderResponse> }
}

export type SASLMechanism = keyof SASLMechanismOptionsMap
type SASLMechanismOptions<T> = T extends SASLMechanism ? { mechanism: T } & SASLMechanismOptionsMap[T] : never
export type SASLOptions = SASLMechanismOptions<SASLMechanism>

export interface ProducerConfig {
    createPartitioner?: ICustomPartitioner
    retry?: RetryOptions
    metadataMaxAge?: number
    allowAutoTopicCreation?: boolean
    idempotent?: boolean
    transactionalId?: string
    transactionTimeout?: number
    maxInFlightRequests?: number
}

export interface Message {
    key?: Buffer | string | null
    value: Buffer | string | null
    partition?: number
    headers?: IHeaders
    timestamp?: string
}

export interface PartitionerArgs {
    topic: string
    partitionMetadata: PartitionMetadata[]
    message: Message
}

export type ICustomPartitioner = () => (args: PartitionerArgs) => number
export type DefaultPartitioner = ICustomPartitioner
export type JavaCompatiblePartitioner = ICustomPartitioner

export declare const Partitioners: {
    DefaultPartitioner: DefaultPartitioner
    JavaCompatiblePartitioner: JavaCompatiblePartitioner
}

export type PartitionMetadata = {
    partitionErrorCode: number
    partitionId: number
    leader: number
    replicas: number[]
    isr: number[]
    offlineReplicas?: number[]
}

export interface IHeaders {
    [key: string]: Buffer | string | undefined
}

export interface ConsumerConfig {
    groupId: string
    partitionAssigners?: PartitionAssigner[]
    metadataMaxAge?: number
    sessionTimeout?: number
    rebalanceTimeout?: number
    heartbeatInterval?: number
    maxBytesPerPartition?: number
    minBytes?: number
    maxBytes?: number
    maxWaitTimeInMs?: number
    retry?: RetryOptions & { restartOnFailure?: (err: Error) => Promise<boolean> }
    allowAutoTopicCreation?: boolean
    maxInFlightRequests?: number
    readUncommitted?: boolean
    rackId?: string
}

export type PartitionAssigner = (config: { cluster: Cluster }) => Assigner

export interface CoordinatorMetadata {
    errorCode: number
    coordinator: {
        nodeId: number
        host: string
        port: number
    }
}

export type Cluster = {
    isConnected(): boolean
    connect(): Promise<void>
    disconnect(): Promise<void>
    refreshMetadata(): Promise<void>
    refreshMetadataIfNecessary(): Promise<void>
    addTargetTopic(topic: string): Promise<void>
    findBroker(node: { nodeId: string }): Promise<Broker>
    findControllerBroker(): Promise<Broker>
    findTopicPartitionMetadata(topic: string): PartitionMetadata[]
    findLeaderForPartitions(topic: string, partitions: number[]): { [leader: string]: number[] }
    findGroupCoordinator(group: { groupId: string }): Promise<Broker>
    findGroupCoordinatorMetadata(group: { groupId: string }): Promise<CoordinatorMetadata>
    defaultOffset(config: { fromBeginning: boolean }): number
    fetchTopicsOffset(
        topics: Array<
            {
                topic: string
                partitions: Array<{ partition: number }>
            } & XOR<{ fromBeginning: boolean }, { fromTimestamp: number }>
        >
    ): Promise<{ topic: string; partitions: Array<{ partition: number; offset: string }> }>
}

export type Assignment = { [topic: string]: number[] }

export type GroupMember = { memberId: string; memberMetadata: Buffer }

export type GroupMemberAssignment = { memberId: string; memberAssignment: Buffer }

export type GroupState = { name: string; metadata: Buffer }

export type Assigner = {
    name: string
    version: number
    assign(group: { members: GroupMember[]; topics: string[] }): Promise<GroupMemberAssignment[]>
    protocol(subscription: { topics: string[] }): GroupState
}

export interface RetryOptions {
    maxRetryTime?: number
    initialRetryTime?: number
    factor?: number
    multiplier?: number
    retries?: number
}

export interface AdminConfig {
    retry?: RetryOptions
}

export interface ITopicConfig {
    topic: string
    numPartitions?: number
    replicationFactor?: number
    replicaAssignment?: object[]
    configEntries?: object[]
}

export interface ITopicPartitionConfig {
    topic: string
    count: number
    assignments?: Array<Array<number>>
}

export interface ITopicMetadata {
    name: string
    partitions: PartitionMetadata[]
}

/**
 * @deprecated
 * Use ConfigResourceTypes or AclResourceTypes
 */
export enum ResourceTypes {
    UNKNOWN = 0,
    ANY = 1,
    TOPIC = 2,
    GROUP = 3,
    CLUSTER = 4,
    TRANSACTIONAL_ID = 5,
    DELEGATION_TOKEN = 6,
}

export enum AclResourceTypes {
    UNKNOWN = 0,
    ANY = 1,
    TOPIC = 2,
    GROUP = 3,
    CLUSTER = 4,
    TRANSACTIONAL_ID = 5,
    DELEGATION_TOKEN = 6,
}

export enum ConfigResourceTypes {
    UNKNOWN = 0,
    TOPIC = 2,
    BROKER = 4,
    BROKER_LOGGER = 8,
}

export enum AclPermissionTypes {
    UNKNOWN = 0,
    ANY = 1,
    DENY = 2,
    ALLOW = 3,
}

export enum AclOperationTypes {
    UNKNOWN = 0,
    ANY = 1,
    ALL = 2,
    READ = 3,
    WRITE = 4,
    CREATE = 5,
    DELETE = 6,
    ALTER = 7,
    DESCRIBE = 8,
    CLUSTER_ACTION = 9,
    DESCRIBE_CONFIGS = 10,
    ALTER_CONFIGS = 11,
    IDEMPOTENT_WRITE = 12,
}

export enum ResourcePatternTypes {
    UNKNOWN = 0,
    ANY = 1,
    MATCH = 2,
    LITERAL = 3,
    PREFIXED = 4,
}

export interface ResourceConfigQuery {
    type: ResourceTypes | ConfigResourceTypes
    name: string
    configNames?: string[]
}

export interface ConfigEntries {
    configName: string
    configValue: string
    isDefault: boolean
    isSensitive: boolean
    readOnly: boolean
    configSynonyms: ConfigSynonyms[]
}

export interface ConfigSynonyms {
    configName: string
    configValue: string
    configSource: number
}

export interface DescribeConfigResponse {
    resources: {
        configEntries: ConfigEntries[]
        errorCode: number
        errorMessage: string
        resourceName: string
        resourceType: ResourceTypes | ConfigResourceTypes
    }[]
    throttleTime: number
}

export interface IResourceConfig {
    type: ResourceTypes | ConfigResourceTypes
    name: string
    configEntries: { name: string; value: string }[]
}

type ValueOf<T> = T[keyof T]

export type AdminEvents = {
    CONNECT: 'admin.connect'
    DISCONNECT: 'admin.disconnect'
    REQUEST: 'admin.network.request'
    REQUEST_TIMEOUT: 'admin.network.request_timeout'
    REQUEST_QUEUE_SIZE: 'admin.network.request_queue_size'
}

export interface InstrumentationEvent<T> {
    id: string
    type: string
    timestamp: number
    payload: T
}

export type RemoveInstrumentationEventListener<T> = () => void

export type ConnectEvent = InstrumentationEvent<null>
export type DisconnectEvent = InstrumentationEvent<null>
export type RequestEvent = InstrumentationEvent<{
    apiKey: number
    apiName: string
    apiVersion: number
    broker: string
    clientId: string
    correlationId: number
    createdAt: number
    duration: number
    pendingDuration: number
    sentAt: number
    size: number
}>
export type RequestTimeoutEvent = InstrumentationEvent<{
    apiKey: number
    apiName: string
    apiVersion: number
    broker: string
    clientId: string
    correlationId: number
    createdAt: number
    pendingDuration: number
    sentAt: number
}>
export type RequestQueueSizeEvent = InstrumentationEvent<{
    broker: string
    clientId: string
    queueSize: number
}>

export interface SeekEntry {
    partition: number
    offset: string
}

export interface Acl {
    principal: string
    host: string
    operation: AclOperationTypes
    permissionType: AclPermissionTypes
}

export interface AclResource {
    resourceType: AclResourceTypes
    resourceName: string
    resourcePatternType: ResourcePatternTypes
}

export type AclEntry = Acl & AclResource

export type DescribeAclResource = AclResource & {
    acl: Acl[]
}

export interface DescribeAclResponse {
    throttleTime: number
    errorCode: number
    errorMessage?: string
    resources: DescribeAclResource[]
}

export interface AclFilter {
    resourceType: AclResourceTypes
    resourceName?: string
    resourcePatternType: ResourcePatternTypes
    principal?: string
    host?: string
    operation: AclOperationTypes
    permissionType: AclPermissionTypes
}

export interface MatchingAcl {
    errorCode: number
    errorMessage?: string
    resourceType: AclResourceTypes
    resourceName: string
    resourcePatternType: ResourcePatternTypes
    principal: string
    host: string
    operation: AclOperationTypes
    permissionType: AclPermissionTypes
}

export interface DeleteAclFilterResponses {
    errorCode: number
    errorMessage?: string
    matchingAcls: MatchingAcl[]
}

export interface DeleteAclResponse {
    throttleTime: number
    filterResponses: DeleteAclFilterResponses[]
}

export type Admin = {
    connect(): Promise<void>
    disconnect(): Promise<void>
    listTopics(): Promise<string[]>
    createTopics(options: {
        validateOnly?: boolean
        waitForLeaders?: boolean
        timeout?: number
        topics: ITopicConfig[]
    }): Promise<boolean>
    deleteTopics(options: { topics: string[]; timeout?: number }): Promise<void>
    createPartitions(options: {
        validateOnly?: boolean
        timeout?: number
        topicPartitions: ITopicPartitionConfig[]
    }): Promise<boolean>
    fetchTopicMetadata(options?: { topics: string[] }): Promise<{ topics: Array<ITopicMetadata> }>
    fetchOffsets(options: {
        groupId: string
        topic: string
        resolveOffsets?: boolean
    }): Promise<Array<SeekEntry & { metadata: string | null }>>
    fetchTopicOffsets(topic: string): Promise<Array<SeekEntry & { high: string; low: string }>>
    fetchTopicOffsetsByTimestamp(topic: string, timestamp?: number): Promise<Array<SeekEntry>>
    describeCluster(): Promise<{
        brokers: Array<{ nodeId: number; host: string; port: number }>
        controller: number | null
        clusterId: string
    }>
    setOffsets(options: { groupId: string; topic: string; partitions: SeekEntry[] }): Promise<void>
    resetOffsets(options: { groupId: string; topic: string; earliest: boolean }): Promise<void>
    describeConfigs(configs: {
        resources: ResourceConfigQuery[]
        includeSynonyms: boolean
    }): Promise<DescribeConfigResponse>
    alterConfigs(configs: { validateOnly: boolean; resources: IResourceConfig[] }): Promise<any>
    listGroups(): Promise<{ groups: GroupOverview[] }>
    deleteGroups(groupIds: string[]): Promise<DeleteGroupsResult[]>
    describeGroups(groupIds: string[]): Promise<GroupDescriptions>
    describeAcls(options: AclFilter): Promise<DescribeAclResponse>
    deleteAcls(options: { filters: AclFilter[] }): Promise<DeleteAclResponse>
    createAcls(options: { acl: AclEntry[] }): Promise<boolean>
    deleteTopicRecords(options: { topic: string; partitions: SeekEntry[] }): Promise<void>
    logger(): Logger
    on(
        eventName: ValueOf<AdminEvents>,
        listener: (...args: any[]) => void
    ): RemoveInstrumentationEventListener<typeof eventName>
    events: AdminEvents
}

export declare const PartitionAssigners: { roundRobin: PartitionAssigner }

export interface ISerializer<T> {
    encode(value: T): Buffer
    decode(buffer: Buffer): T | null
}

export type MemberMetadata = {
    version: number
    topics: string[]
    userData: Buffer
}

export type MemberAssignment = {
    version: number
    assignment: Assignment
    userData: Buffer
}

export declare const AssignerProtocol: {
    MemberMetadata: ISerializer<MemberMetadata>
    MemberAssignment: ISerializer<MemberAssignment>
}

export enum logLevel {
    NOTHING = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 4,
    DEBUG = 5,
}

export interface LogEntry {
    namespace: string
    level: logLevel
    label: string
    log: LoggerEntryContent
}

export interface LoggerEntryContent {
    readonly timestamp: Date
    readonly message: string
    [key: string]: any
}

export type logCreator = (logLevel: logLevel) => (entry: LogEntry) => void

export type Logger = {
    info: (message: string, extra?: object) => void
    error: (message: string, extra?: object) => void
    warn: (message: string, extra?: object) => void
    debug: (message: string, extra?: object) => void
}

export type Broker = {
    isConnected(): boolean
    connect(): Promise<void>
    disconnect(): Promise<void>
    apiVersions(): Promise<{ [apiKey: number]: { minVersion: number; maxVersion: number } }>
    metadata(
        topics: string[]
    ): Promise<{
        brokers: Array<{ nodeId: number; host: string; port: number; rack?: string }>
        topicMetadata: Array<{
            topicErrorCode: number
            topic: number
            partitionMetadata: PartitionMetadata[]
        }>
    }>
    offsetCommit(request: {
        groupId: string
        groupGenerationId: number
        memberId: string
        retentionTime?: number
        topics: Array<{ topic: string; partitions: Array<{ partition: number; offset: string }> }>
    }): Promise<any>
    fetch(request: {
        replicaId?: number
        isolationLevel?: number
        maxWaitTime?: number
        minBytes?: number
        maxBytes?: number
        topics: Array<{
            topic: string
            partitions: Array<{ partition: number; fetchOffset: string; maxBytes: number }>
        }>
        rackId?: string
    }): Promise<any>
}

export type KafkaMessage = {
    key: Buffer
    value: Buffer | null
    timestamp: string
    size: number
    attributes: number
    offset: string
    headers?: IHeaders
}

export interface ProducerRecord {
    topic: string
    messages: Message[]
    acks?: number
    timeout?: number
    compression?: CompressionTypes
}

export type RecordMetadata = {
    topicName: string
    partition: number
    errorCode: number
    offset?: string
    timestamp?: string
    baseOffset?: string
    logAppendTime?: string
    logStartOffset?: string
}

export interface TopicMessages {
    topic: string
    messages: Message[]
}

export interface ProducerBatch {
    acks?: number
    timeout?: number
    compression?: CompressionTypes
    topicMessages?: TopicMessages[]
}

export interface PartitionOffset {
    partition: number
    offset: string
}

export interface TopicOffsets {
    topic: string
    partitions: PartitionOffset[]
}

export interface Offsets {
    topics: TopicOffsets[]
}

type Sender = {
    send(record: ProducerRecord): Promise<RecordMetadata[]>
    sendBatch(batch: ProducerBatch): Promise<RecordMetadata[]>
}

export type ProducerEvents = {
    CONNECT: 'producer.connect'
    DISCONNECT: 'producer.disconnect'
    REQUEST: 'producer.network.request'
    REQUEST_TIMEOUT: 'producer.network.request_timeout'
    REQUEST_QUEUE_SIZE: 'producer.network.request_queue_size'
}

export type Producer = Sender & {
    connect(): Promise<void>
    disconnect(): Promise<void>
    isIdempotent(): boolean
    events: ProducerEvents
    on(
        eventName: ValueOf<ProducerEvents>,
        listener: (...args: any[]) => void
    ): RemoveInstrumentationEventListener<typeof eventName>
    transaction(): Promise<Transaction>
    logger(): Logger
}

export type Transaction = Sender & {
    sendOffsets(offsets: Offsets & { consumerGroupId: string }): Promise<void>
    commit(): Promise<void>
    abort(): Promise<void>
    isActive(): boolean
}

export type ConsumerGroup = {
    groupId: string
    generationId: number
    memberId: string
    coordinator: Broker
}

export type MemberDescription = {
    clientHost: string
    clientId: string
    memberId: string
    memberAssignment: Buffer
    memberMetadata: Buffer
}

// See https://github.com/apache/kafka/blob/2.4.0/clients/src/main/java/org/apache/kafka/common/ConsumerGroupState.java#L25
export type ConsumerGroupState = 'Unknown' | 'PreparingRebalance' | 'CompletingRebalance' | 'Stable' | 'Dead' | 'Empty';

export type GroupDescription = {
    groupId: string
    members: MemberDescription[]
    protocol: string
    protocolType: string
    state: ConsumerGroupState
}

export type GroupDescriptions = {
    groups: GroupDescription[]
}

export type TopicPartitions = { topic: string; partitions: number[] }
export type TopicPartitionOffsetAndMetadata = {
    topic: string
    partition: number
    offset: string
    metadata?: string | null
}

// TODO: Remove with 2.x
export type TopicPartitionOffsetAndMedata = TopicPartitionOffsetAndMetadata

export type Batch = {
    topic: string
    partition: number
    highWatermark: string
    messages: KafkaMessage[]
    isEmpty(): boolean
    firstOffset(): string | null
    lastOffset(): string
    offsetLag(): string
    offsetLagLow(): string
}

export type GroupOverview = {
    groupId: string
    protocolType: string
}

export type DeleteGroupsResult = {
    groupId: string
    errorCode?: number
    error?: KafkaJSProtocolError
}

export type ConsumerEvents = {
    HEARTBEAT: 'consumer.heartbeat'
    COMMIT_OFFSETS: 'consumer.commit_offsets'
    GROUP_JOIN: 'consumer.group_join'
    FETCH_START: 'consumer.fetch_start'
    FETCH: 'consumer.fetch'
    START_BATCH_PROCESS: 'consumer.start_batch_process'
    END_BATCH_PROCESS: 'consumer.end_batch_process'
    CONNECT: 'consumer.connect'
    DISCONNECT: 'consumer.disconnect'
    STOP: 'consumer.stop'
    CRASH: 'consumer.crash'
    RECEIVED_UNSUBSCRIBED_TOPICS: 'consumer.received_unsubscribed_topics'
    REQUEST: 'consumer.network.request'
    REQUEST_TIMEOUT: 'consumer.network.request_timeout'
    REQUEST_QUEUE_SIZE: 'consumer.network.request_queue_size'
}
export type ConsumerHeartbeatEvent = InstrumentationEvent<{
    groupId: string
    memberId: string
    groupGenerationId: number
}>
export type ConsumerCommitOffsetsEvent = InstrumentationEvent<{
    groupId: string
    memberId: string
    groupGenerationId: number
    topics: {
        topic: string
        partitions: {
            offset: string
            partition: string
        }[]
    }[]
}>
export interface IMemberAssignment {
    [key: string]: number[]
}
export type ConsumerGroupJoinEvent = InstrumentationEvent<{
    duration: number
    groupId: string
    isLeader: boolean
    leaderId: string
    groupProtocol: string
    memberId: string
    memberAssignment: IMemberAssignment
}>
export type ConsumerFetchEvent = InstrumentationEvent<{
    numberOfBatches: number
    duration: number
}>
interface IBatchProcessEvent {
    topic: string
    partition: number
    highWatermark: string
    offsetLag: string
    offsetLagLow: string
    batchSize: number
    firstOffset: string
    lastOffset: string
}
export type ConsumerStartBatchProcessEvent = InstrumentationEvent<IBatchProcessEvent>
export type ConsumerEndBatchProcessEvent = InstrumentationEvent<
    IBatchProcessEvent & { duration: number }
>
export type ConsumerCrashEvent = InstrumentationEvent<{
    error: Error
    groupId: string
    restart: boolean
}>
export type ConsumerReceivedUnsubcribedTopicsEvent = InstrumentationEvent<{
    groupId: string
    generationId: number
    memberId: string
    assignedTopics: string[]
    topicsSubscribed: string[]
    topicsNotSubscribed: string[]
}>

export interface OffsetsByTopicPartition {
    topics: TopicOffsets[]
}

export interface EachMessagePayload {
    topic: string
    partition: number
    message: KafkaMessage
}

export interface EachBatchPayload {
    batch: Batch
    resolveOffset(offset: string): void
    heartbeat(): Promise<void>
    commitOffsetsIfNecessary(offsets?: Offsets): Promise<void>
    uncommittedOffsets(): OffsetsByTopicPartition
    isRunning(): boolean
    isStale(): boolean
}

/**
 * Type alias to keep compatibility with @types/kafkajs
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/712ad9d59ccca6a3cc92f347fea0d1c7b02f5eeb/types/kafkajs/index.d.ts#L321-L325
 */
export type ConsumerEachMessagePayload = EachMessagePayload

/**
 * Type alias to keep compatibility with @types/kafkajs
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/712ad9d59ccca6a3cc92f347fea0d1c7b02f5eeb/types/kafkajs/index.d.ts#L327-L336
 */
export type ConsumerEachBatchPayload = EachBatchPayload

export type ConsumerRunConfig = {
    autoCommit?: boolean
    autoCommitInterval?: number | null
    autoCommitThreshold?: number | null
    eachBatchAutoResolve?: boolean
    partitionsConsumedConcurrently?: number
    eachBatch?: (payload: EachBatchPayload) => Promise<void>
    eachMessage?: (payload: EachMessagePayload) => Promise<void>
}

export type ConsumerSubscribeTopic = { topic: string | RegExp; fromBeginning?: boolean }

export type Consumer = {
    connect(): Promise<void>
    disconnect(): Promise<void>
    subscribe(topic: ConsumerSubscribeTopic): Promise<void>
    stop(): Promise<void>
    run(config?: ConsumerRunConfig): Promise<void>
    commitOffsets(topicPartitions: Array<TopicPartitionOffsetAndMetadata>): Promise<void>
    seek(topicPartition: { topic: string; partition: number; offset: string }): void
    describeGroup(): Promise<GroupDescription>
    pause(topics: Array<{ topic: string; partitions?: number[] }>): void
    paused(): TopicPartitions[]
    resume(topics: Array<{ topic: string; partitions?: number[] }>): void
    on(
        eventName: ValueOf<ConsumerEvents>,
        listener: (...args: any[]) => void
    ): RemoveInstrumentationEventListener<typeof eventName>
    logger(): Logger
    events: ConsumerEvents
}

export enum CompressionTypes {
    None = 0,
    GZIP = 1,
    Snappy = 2,
    LZ4 = 3,
    ZSTD = 4,
}

export var CompressionCodecs: {
    [CompressionTypes.GZIP]: () => any
    [CompressionTypes.Snappy]: () => any
    [CompressionTypes.LZ4]: () => any
    [CompressionTypes.ZSTD]: () => any
}

export declare class KafkaJSError extends Error {
    readonly message: Error["message"];
    readonly name: string;
    readonly retriable: boolean;
    readonly helpUrl?: string;

    constructor(e: Error | string, metadata?: KafkaJSErrorMetadata)
}

export declare class KafkaJSNonRetriableError extends KafkaJSError {
    constructor(e: Error | string)
}

export declare class KafkaJSProtocolError extends KafkaJSError {
    readonly code: number;
    readonly type: string;
    constructor(e: Error | string)
}

export declare class KafkaJSOffsetOutOfRange extends KafkaJSProtocolError {
    readonly topic: string;
    readonly partition: number;
    constructor(e: Error | string, metadata?: KafkaJSOffsetOutOfRangeMetadata)
}

export declare class KafkaJSNumberOfRetriesExceeded extends KafkaJSNonRetriableError {
    readonly stack: string;
    readonly originalError: Error;
    readonly retryCount: number;
    readonly retryTime: number;
    constructor(e: Error | string, metadata?: KafkaJSNumberOfRetriesExceededMetadata)
}

export declare class KafkaJSConnectionError extends KafkaJSError {
    readonly broker: string;
    constructor(e: Error | string, metadata?: KafkaJSConnectionErrorMetadata)
}

export declare class KafkaJSRequestTimeoutError extends KafkaJSError {
    readonly broker: string;
    readonly correlationId: number;
    readonly createdAt: number;
    readonly sentAt: number;
    readonly pendingDuration: number;
    constructor(e: Error | string, metadata?: KafkaJSRequestTimeoutErrorMetadata)
}

export declare class KafkaJSMetadataNotLoaded extends KafkaJSError {
    constructor()
}

export declare class KafkaJSTopicMetadataNotLoaded extends KafkaJSMetadataNotLoaded {
    readonly topic: string;
    constructor(e: Error | string, metadata?: KafkaJSTopicMetadataNotLoadedMetadata)
}

export declare class KafkaJSStaleTopicMetadataAssignment extends KafkaJSError {
    readonly topic: string;
    readonly unknownPartitions: number;
    constructor(e: Error | string, metadata?: KafkaJSStaleTopicMetadataAssignmentMetadata)
}

export declare class KafkaJSServerDoesNotSupportApiKey extends KafkaJSNonRetriableError {
    readonly apiKey: number;
    readonly apiName: string
    constructor(e: Error | string, metadata?: KafkaJSServerDoesNotSupportApiKeyMetadata)
}

export declare class KafkaJSBrokerNotFound extends KafkaJSError {
    constructor()
}

export declare class KafkaJSPartialMessageError extends KafkaJSError {
    constructor()
}

export declare class KafkaJSSASLAuthenticationError extends KafkaJSError {
    constructor()
}

export declare class KafkaJSGroupCoordinatorNotFound extends KafkaJSError {
    constructor()
}

export declare class KafkaJSNotImplemented extends KafkaJSError {
    constructor()
}

export declare class KafkaJSTimeout extends KafkaJSError {
    constructor()
}

export declare class KafkaJSLockTimeout extends KafkaJSError {
    constructor()
}

export declare class KafkaJSUnsupportedMagicByteInMessageSet extends KafkaJSError {
    constructor()
}

export declare class KafkaJSDeleteGroupsError extends KafkaJSError {
    readonly groups: DeleteGroupsResult[];
    constructor(e: Error | string, groups?: KafkaJSDeleteGroupsErrorGroups[])
}

export declare class KafkaJSDeleteTopicRecordsError extends KafkaJSError {
    constructor(metadata: KafkaJSDeleteTopicRecordsErrorTopic)
}

export interface KafkaJSDeleteGroupsErrorGroups {
    groupId: string
    errorCode: number
    error: KafkaJSError
}


export interface KafkaJSDeleteTopicRecordsErrorTopic {
    topic: string,
    partitions: KafkaJSDeleteTopicRecordsErrorPartition[]
}

export interface KafkaJSDeleteTopicRecordsErrorPartition {
    partition: number;
    offset: string;
    error: KafkaJSError
}

export interface KafkaJSErrorMetadata {
    retriable?: boolean
    topic?: string
    partitionId?: number
    metadata?: PartitionMetadata
}

export interface KafkaJSOffsetOutOfRangeMetadata {
    topic: string
    partition: number
}

export interface KafkaJSNumberOfRetriesExceededMetadata {
    retryCount: number
    retryTime: number
}

export interface KafkaJSConnectionErrorMetadata {
    broker?: string
    code?: string
}

export interface KafkaJSRequestTimeoutErrorMetadata {
    broker: string
    clientId: string
    correlationId: number
    createdAt: number
    sentAt: number
    pendingDuration: number
}

export interface KafkaJSTopicMetadataNotLoadedMetadata {
    topic: string
}

export interface KafkaJSStaleTopicMetadataAssignmentMetadata {
    topic: string
    unknownPartitions: PartitionMetadata[]
}

export interface KafkaJSServerDoesNotSupportApiKeyMetadata {
    apiKey: number
    apiName: string
}


