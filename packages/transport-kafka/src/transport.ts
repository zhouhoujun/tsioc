import { AssignerProtocol, Cluster, ConsumerRunConfig, EachMessagePayload, GroupMember, GroupMemberAssignment, GroupState, MemberMetadata, ConsumerSubscribeTopics, ProducerRecord, IHeaders } from 'kafkajs';
import { Abstract, EMPTY, Execption, Injectable, Optional, isArray, isNil, isNumber, isString, isUndefined } from '@tsdi/ioc';
import { HeaderPacket, IncomingHeaders, NotFoundExecption } from '@tsdi/common';
import { Decoder, Encoder, StreamAdapter, TransportSessionFactory, TransportSessionOpts, MessageTransportSession, Subpackage, ev, hdr, isBuffer } from '@tsdi/transport';
import { KafkaHeaders, KafkaTransport } from './const';


export interface KafkaTransportOpts extends TransportSessionOpts, ConsumerRunConfig {
    subscribe?: Omit<ConsumerSubscribeTopics, 'topic'>;
    run?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>;
    send?: Omit<ProducerRecord, 'topic' | 'messages'>;
    consumerAssignments?: { [key: string]: number };
}

@Abstract()
export abstract class KafkaTransportSessionFactory extends TransportSessionFactory<KafkaTransport> {
    abstract create(socket: KafkaTransport, opts: KafkaTransportOpts): KafkaTransportSession;
}


@Injectable()
export class KafkaTransportSessionFactoryImpl implements KafkaTransportSessionFactory {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: KafkaTransport, opts: KafkaTransportOpts): KafkaTransportSession {
        return new KafkaTransportSession(socket, this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}

export class KafkaTransportSession extends MessageTransportSession<KafkaTransport, EachMessagePayload, KafkaTransportOpts> {

    private regTopics?: RegExp[];

    maxSize = 1024 * 256;

    protected override getBindEvents(): string[] {
        return EMPTY
    }

    protected override bindMessageEvent() { }

    async bindTopics(topics: (string | RegExp)[]) {
        const consumer = this.socket.consumer;
        if (!consumer) throw new Execption('No consumer');
        await consumer.subscribe({
            topics,
            ... this.options.subscribe,
        });

        this.regTopics = topics.filter(t => t instanceof RegExp) as RegExp[];

        await consumer.run({
            // autoCommit: true,
            // autoCommitInterval: 5000,
            // autoCommitThreshold: 100,
            ...this.options.run,
            eachMessage: async (payload) => {
                if (this.options.serverSide && payload.topic.endsWith('.reply')) return;
                this.onData(payload, payload.topic)
            }
        })
    }


    write(subpkg: Subpackage & { partition?: number, kafkaheaders: IHeaders }, chunk: Buffer | null, callback: (err?: any) => void) {
        if (!subpkg.headerSent) {
            const headers: IHeaders = {};
            Object.keys(subpkg.packet.headers!).forEach(k => {
                headers[k] = this.generHead(subpkg.packet.headers![k]);
            });
            headers[KafkaHeaders.CORRELATION_ID] = `${subpkg.packet.id}`;
            const topic = subpkg.packet.topic || subpkg.packet.url!;
            if (!this.options.serverSide) {
                const replyTopic = subpkg.packet.replyTo ?? this.getReplyTopic(topic);
                headers[KafkaHeaders.REPLY_TOPIC] = Buffer.from(replyTopic);
                if (this.options.consumerAssignments && !isNil(this.options.consumerAssignments[replyTopic])) {
                    headers[KafkaHeaders.REPLY_PARTITION] = Buffer.from(this.options.consumerAssignments[replyTopic].toString());
                } else if (!this.regTopics?.some(i => i.test(replyTopic))) {
                    throw new NotFoundExecption(replyTopic + ' has not registered.', this.socket.vaildator.notFound);
                }
            }
            subpkg.kafkaheaders = headers;
            subpkg.headerSent = true;
            subpkg.caches = [];
            subpkg.cacheSize = 0;
            subpkg.residueSize = this.getPayloadLength(subpkg.packet);
            if (!subpkg.residueSize) {
                this.writing(subpkg, null, callback);
                return;
            }
        }

        if (!chunk) return callback?.();

        const bufSize = Buffer.byteLength(chunk);
        const maxSize = this.options.maxSize || this.maxSize;

        const tol = subpkg.cacheSize + bufSize;
        if (tol == maxSize) {
            subpkg.caches.push(chunk);
            const data = this.getSendBuffer(subpkg, maxSize);
            subpkg.residueSize -= bufSize;
            this.writing(subpkg, data, callback);
        } else if (tol > maxSize) {
            const idx = bufSize - (tol - maxSize);
            const message = chunk.subarray(0, idx);
            const rest = chunk.subarray(idx);
            subpkg.caches.push(message);
            const data = this.getSendBuffer(subpkg, maxSize);
            subpkg.residueSize -= (bufSize - Buffer.byteLength(rest));
            this.writing(subpkg, data, (err) => {
                if (err) return callback?.(err);
                if (rest.length) {
                    this.write(subpkg, rest, callback)
                }
            })
        } else {
            subpkg.caches.push(chunk);
            subpkg.cacheSize += bufSize;
            subpkg.residueSize -= bufSize;
            if (subpkg.residueSize <= 0) {
                const data = this.getSendBuffer(subpkg, subpkg.cacheSize);
                this.writing(subpkg, data, callback);
            } else if (callback) {
                callback()
            }
        }


    }

    writing(packet: Subpackage & { partition?: number, kafkaheaders: IHeaders }, chunk: Buffer | null, callback?: (err?: any) => void) {
        const topic = packet.packet.topic || packet.packet.url!;

        this.socket.producer.send({
            ...this.options.send,
            topic,
            messages: [{
                headers: packet.kafkaheaders,
                value: chunk ?? Buffer.alloc(0),
                partition: packet.partition
            }]
        })
            .then(() => callback?.())
            .catch(err => {
                this.handleFailed(err);
                callback?.(err)
            })
    }

    protected createPackage(id: string | number, topic: string, replyTo: string, headers: IncomingHeaders, msg: EachMessagePayload, error?: any): HeaderPacket {
        return {
            id,
            headers,
            topic,
            replyTo,
            url: topic
        }
    }

    protected getIncomingHeaders(msg: EachMessagePayload): IncomingHeaders {
        const headers: IncomingHeaders = {};
        if (msg.message.headers) {
            Object.keys(msg.message.headers).forEach(k => {
                headers[k] = this.parseHead(msg.message.headers![k])
            })
        }
        return headers;
    }
    protected getIncomingPacketId(msg: EachMessagePayload): string | number {
        return msg.message.headers?.[KafkaHeaders.CORRELATION_ID]?.toString() as string;
    }
    protected getIncomingReplyTo(msg: EachMessagePayload): string {
        return this.getReplyTopic(msg.topic);
    }
    protected getIncomingContentType(msg: EachMessagePayload): string | undefined {
        return;
    }
    protected getIncomingContentEncoding(msg: EachMessagePayload): string | undefined {
        return;
    }
    protected getIncomingContentLength(msg: EachMessagePayload): number {
        return ~~(msg.message.headers?.[hdr.CONTENT_LENGTH]?.toString() ?? '0')
    }
    protected getIncomingPayload(msg: EachMessagePayload): string | Buffer | Uint8Array {
        return msg.message.value!;
    }


    protected getReplyTopic(topic: string) {
        return `${topic}.reply`
    }


    protected parseHead(val: Buffer | string | (Buffer | string)[] | undefined): string | string[] | undefined {
        if (isString(val)) return val;
        if (isBuffer(val)) return val.toString();
        if (isArray(val)) return val.map(v => isString(v) ? v : v.toString());
        return `${val}`;
    }

    protected generHead(head: string | number | readonly string[] | undefined): Buffer | string | (Buffer | string)[] | undefined {
        if (isNumber(head)) return Buffer.from(head.toString());
        if (isArray(head)) return head.map(v => v.toString())
        return Buffer.from(`${head}`);
    }

    protected onSocket(name: string, event: (...args: any[]) => void): void {
        throw new Error('Method not implemented.');
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        throw new Error('Method not implemented.');
    }
}


export class KafkaReplyPartitionAssigner {
    readonly name = 'BootReplyPartitionAssigner';
    readonly version = 1;

    constructor(
        readonly transportOpts: KafkaTransportOpts,
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
                !previousAssignment[member.memberId]
                && member.previousAssignment
                && Object.keys(member.previousAssignment).length > 0
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
            memberAssignment: AssignerProtocol.MemberAssignment.encode({
                version: this.version,
                userData: assignment.userData,
                assignment: assignment[memberId],
            }),
        }));
    }

    public protocol(subscription: {
        topics: string[];
        userData: Buffer;
    }): GroupState {
        const stringifiedUserData = JSON.stringify({
            previousAssignment: this.transportOpts.consumerAssignments,
        });
        subscription.userData = Buffer.from(stringifiedUserData);

        return {
            name: this.name,
            metadata: AssignerProtocol.MemberMetadata.encode({
                version: this.version,
                topics: subscription.topics,
                userData: subscription.userData,
            }),
        };
    }


    public decodeMember(member: GroupMember) {
        const memberMetadata = AssignerProtocol.MemberMetadata.decode(
            member.memberMetadata,
        ) as MemberMetadata;
        const memberUserData = JSON.parse(memberMetadata.userData.toString());

        return {
            memberId: member.memberId,
            previousAssignment: memberUserData.previousAssignment,
        };
    }
}

