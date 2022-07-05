import { Inject, Injectable, InvocationContext, isUndefined, ModuleLoader } from '@tsdi/ioc';
import { TransportClient, Protocol, ClientOptions, EndpointBackend, RequstOption, RequestPacket, ResponsePacket } from '@tsdi/core';
import { Level } from '@tsdi/logs';
import { BrokersFunction, Cluster, Consumer, ConsumerConfig, ConsumerGroupJoinEvent, ConsumerRunConfig, ConsumerSubscribeTopic, EachMessagePayload, GroupMember, GroupMemberAssignment, GroupState, Kafka, KafkaConfig, LogEntry, logLevel, MemberMetadata, PartitionAssigner, Producer, ProducerConfig, ProducerRecord } from 'kafkajs';
import { DEFAULT_BROKERS, KafkaHeaders } from '../const';
import { scan } from 'rxjs';

let kafkajs: any;
let uuid: any;

export interface KafkaClientOption extends KafkaConfig, ClientOptions<any, any> {
    postfixId?: string;
    client?: KafkaConfig;
    consumer?: ConsumerConfig;
    run?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>;
    subscribe?: Omit<ConsumerSubscribeTopic, 'topic'>;
    producer?: ProducerConfig;
    send?: Omit<ProducerRecord, 'topic' | 'messages'>;
    keepBinary?: boolean;
}


@Injectable()
export class KafkaClient extends TransportClient {
    protected buildRequest(url: any, options?: RequstOption | undefined) {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<any, any> {
        throw new Error('Method not implemented.');
    }

    protected client: Kafka | undefined;
    protected consumer!: Consumer;
    protected producer!: Producer;
    protected brokers!: string[] | BrokersFunction;
    protected responsePatterns: string[] = [];
    protected consumerAssignments: { [key: string]: number } = {};
    protected clientId!: string;
    protected groupId!: string;



    constructor(context: InvocationContext, private options: KafkaClientOption) {
        super(context, options);
    }

    protected override initOption(options: KafkaClientOption): KafkaClientOption {
        this.options = options;
        this.brokers = options.client?.brokers ?? DEFAULT_BROKERS;
        const postfixId = options.postfixId = options.postfixId ?? '-client';
        this.clientId = (options.client?.clientId ?? 'boot-consumer') + postfixId;
        this.groupId = (options.consumer?.groupId ?? 'boot-group') + postfixId;
        return this.options;
    }

    async connect(): Promise<void> {
        if (this.client) {
            return;
        }

        const brokers = this.brokers;
        const clientId = this.clientId;
        const logCreator = (level: any) =>
            ({ namespace, level, label, log }: LogEntry) => {
                let loggerMethod: Level;

                switch (level) {
                    case logLevel.ERROR:
                    case logLevel.NOTHING:
                        loggerMethod = 'error';
                        break;
                    case logLevel.WARN:
                        loggerMethod = 'warn';
                        break;
                    case logLevel.INFO:
                        loggerMethod = 'log';
                        break;
                    case logLevel.DEBUG:
                    default:
                        loggerMethod = 'debug';
                        break;
                }

                const { message, ...others } = log;
                if (this.logger[loggerMethod]) {
                    this.logger[loggerMethod](
                        `${label} [${namespace}] ${message} ${JSON.stringify(others)}`,
                    );
                }
            };

        const client: Kafka = this.client = new Kafka({
            ...this.options.client,
            brokers,
            clientId,
            logCreator
        });

        this.producer = client.producer(this.options.producer ?? {});

        const partitionAssigners = [
            (config: { cluster: Cluster }) => new KafkaReplyPartitionAssigner(this, config),
        ] as PartitionAssigner[];
        const groupId = this.groupId;
        this.consumer = client.consumer({
            partitionAssigners,
            ...this.options.consumer,
            groupId
        });

        this.consumer.on(
            this.consumer.events.GROUP_JOIN,
            (data: ConsumerGroupJoinEvent) => {
                const consumerAssignments: { [key: string]: number } = {};
                // only need to set the minimum
                Object.keys(data.payload.memberAssignment).forEach(memberId => {
                    const minimumPartition = Math.min(
                        ...data.payload.memberAssignment[memberId],
                    );
                    consumerAssignments[memberId] = minimumPartition;
                });
                this.consumerAssignments = consumerAssignments;
            });

        await this.producer.connect();
        await this.consumer.connect();
        await this.bindTopics();
    }

    public async bindTopics(): Promise<void> {
        const consumerSubscribeOptions = this.options.subscribe || {};
        const subscribeTo = async (responsePattern: string) =>
            this.consumer?.subscribe({
                topic: responsePattern,
                ...consumerSubscribeOptions,
            });
        await Promise.all(this.responsePatterns.map(subscribeTo));

        await this.consumer?.run(
            Object.assign(this.options.run || {}, {
                eachMessage: this.createResponseCallback(),
            }),
        );
    }

    public createResponseCallback(): (payload: EachMessagePayload) => any {
        return async (payload: EachMessagePayload) => {
            const rawMessage = this.parser.parse<KafkaMessage>({
                ...payload.message,
                topic: payload.topic,
                partition: payload.partition,
            });
            if (isUndefined(rawMessage.headers?.[KafkaHeaders.CORRELATION_ID])) {
                return;
            }
            const { err, response, disposed, id } = await this.deserializer.deserialize(rawMessage);
            const callback = this.get(id);
            if (!callback) {
                return;
            }
            if (err || disposed) {
                return callback({
                    err,
                    response,
                    disposed,
                });
            }
            callback({
                err,
                response,
            });
        };
    }

    public getConsumerAssignments() {
        return this.consumerAssignments;
    }

    async close(): Promise<void> {
        this.producer && (await this.producer.disconnect());
        this.consumer && (await this.consumer.disconnect());
        this.producer = null!;
        this.consumer = null!;
        this.client = null!;
    }

    protected publish(partialPacket: RequestPacket<any>, callback: (packet: ResponsePacket<any>) => void): () => void {
        const packet = this.assignPacketId(partialPacket);
        try {
            const pattern = this.normalizePattern(partialPacket.url);
            const replyTopic = this.getResponsePatternName(pattern);
            const replyPartition = this.getReplyTopicPartition(replyTopic);

            const serializedPacket: KafkaRequest = this.serializer.serialize(packet.data);
            serializedPacket.headers[KafkaHeaders.CORRELATION_ID] = packet.id;
            serializedPacket.headers[KafkaHeaders.REPLY_TOPIC] = replyTopic;
            serializedPacket.headers[KafkaHeaders.REPLY_PARTITION] = replyPartition;

            this.routing.set(packet.id, callback);

            this.producer.send({
                topic: pattern,
                messages: [serializedPacket],
                ...this.options.send
            }).catch(err => callback({ err }));
        } catch (err) {
            callback({ err });
        } finally {
            return () => this.routing.delete(packet.id);
        }
    }

    protected assignPacketId(packet: RequestPacket): RequestPacket {
        const id = uuid();
        return { ...packet, id };
    }

    protected getReplyTopicPartition(topic: string): string {
        const minimumPartition = this.consumerAssignments[topic];
        if (isUndefined(minimumPartition)) {
            throw new InvalidKafkaClientTopicError(topic);
        }
        return minimumPartition.toString();
    }

    protected getResponsePatternName(pattern: string): string {
        return `${pattern}.reply`;
    }

    protected dispatchEvent(packet: TransportEvent): Promise<any> {
        const topic = this.normalizePattern(packet.pattern);
        const messages = [this.serializer.serialize(packet.data)];
        return this.producer.send({
            topic,
            messages,
            ...this.options.send
        });
    }

}


export class KafkaReplyPartitionAssigner {
    readonly name = 'BootReplyPartitionAssigner';
    readonly version = 1;

    constructor(
        private readonly clientKafka: KafkaClient,
        private readonly config: {
            cluster: Cluster;
        }
    ) {

    }

    /**
     * This process can result in imbalanced assignments
     * @param {array} members array of members, e.g: [{ memberId: 'test-5f93f5a3' }]
     * @param {array} topics
     * @param {Buffer} userData
     * @returns {array} object partitions per topic per member
     */
    public async assign(group: {
        members: GroupMember[];
        topics: string[];
    }): Promise<GroupMemberAssignment[]> {
        const assignment: Record<string, any> = {};
        const previousAssignment: Record<string, any> = {};

        const membersCount = group.members.length;
        const decodedMembers = group.members.map(member =>
            this.decodeMember(member),
        );
        const sortedMemberIds = decodedMembers
            .map(member => member.memberId)
            .sort();

        // build the previous assignment and an inverse map of topic > partition > memberId for lookup
        decodedMembers.forEach(member => {
            if (
                !previousAssignment[member.memberId] &&
                Object.keys(member.previousAssignment).length > 0
            ) {
                previousAssignment[member.memberId] = member.previousAssignment;
            }
        });

        // build a collection of topics and partitions
        const topicsPartitions = group.topics
            .map(topic => {
                const partitionMetadata =
                    this.config.cluster.findTopicPartitionMetadata(topic);
                return partitionMetadata.map(m => {
                    return {
                        topic,
                        partitionId: m.partitionId,
                    };
                });
            })
            .reduce((acc, val) => acc.concat(val), []);

        // create the new assignment by populating the members with the first partition of the topics
        sortedMemberIds.forEach(assignee => {
            if (!assignment[assignee]) {
                assignment[assignee] = {};
            }

            // add topics to each member
            group.topics.forEach(topic => {
                if (!assignment[assignee][topic]) {
                    assignment[assignee][topic] = [];
                }

                // see if the topic and partition belong to a previous assignment
                if (
                    previousAssignment[assignee] &&
                    !isUndefined(previousAssignment[assignee][topic])
                ) {
                    // take the minimum partition since replies will be sent to the minimum partition
                    const firstPartition = previousAssignment[assignee][topic];

                    // create the assignment with the first partition
                    assignment[assignee][topic].push(firstPartition);

                    // find and remove this topic and partition from the topicPartitions to be assigned later
                    const topicsPartitionsIndex = topicsPartitions.findIndex(
                        topicPartition => {
                            return (
                                topicPartition.topic === topic &&
                                topicPartition.partitionId === firstPartition
                            );
                        },
                    );

                    // only continue if we found a partition matching this topic
                    if (topicsPartitionsIndex !== -1) {
                        // remove inline
                        topicsPartitions.splice(topicsPartitionsIndex, 1);
                    }
                }
            });
        });

        // check for member topics that have a partition length of 0
        sortedMemberIds.forEach(assignee => {
            group.topics.forEach(topic => {
                // only continue if there are no partitions for assignee's topic
                if (assignment[assignee][topic].length === 0) {
                    // find the first partition for this topic
                    const topicsPartitionsIndex = topicsPartitions.findIndex(
                        topicPartition => {
                            return topicPartition.topic === topic;
                        },
                    );

                    if (topicsPartitionsIndex !== -1) {
                        // find and set the topic partition
                        const partition =
                            topicsPartitions[topicsPartitionsIndex].partitionId;

                        assignment[assignee][topic].push(partition);

                        // remove this partition from the topics partitions collection
                        topicsPartitions.splice(topicsPartitionsIndex, 1);
                    }
                }
            });
        });

        // build the assignments
        topicsPartitions.forEach((topicPartition, i) => {
            const assignee = sortedMemberIds[i % membersCount];

            assignment[assignee][topicPartition.topic].push(
                topicPartition.partitionId,
            );
        });

        // encode the end result
        return Object.keys(assignment).map(memberId => ({
            memberId,
            memberAssignment: kafkajs.AssignerProtocol.MemberAssignment.encode({
                version: this.version,
                assignment: assignment[memberId],
            }),
        }));
    }

    public protocol(subscription: {
        topics: string[];
        userData: Buffer;
    }): GroupState {
        const stringifiedUserData = JSON.stringify({
            previousAssignment: this.getPreviousAssignment(),
        });
        subscription.userData = Buffer.from(stringifiedUserData);

        return {
            name: this.name,
            metadata: kafkajs.AssignerProtocol.MemberMetadata.encode({
                version: this.version,
                topics: subscription.topics,
                userData: subscription.userData,
            }),
        };
    }

    public getPreviousAssignment() {
        return this.clientKafka.getConsumerAssignments();
    }

    public decodeMember(member: GroupMember) {
        const memberMetadata = kafkajs.AssignerProtocol.MemberMetadata.decode(
            member.memberMetadata,
        ) as MemberMetadata;
        const memberUserData = JSON.parse(memberMetadata.userData.toString());

        return {
            memberId: member.memberId,
            previousAssignment: memberUserData.previousAssignment,
        };
    }
}


