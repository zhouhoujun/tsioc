import { AssignerProtocol, Cluster, ConsumerRunConfig, EachMessagePayload, GroupMember, GroupMemberAssignment, GroupState, MemberMetadata, ConsumerSubscribeTopics, ProducerRecord, IHeaders } from 'kafkajs';
import { Abstract, EMPTY, Execption, Injectable, Optional, isArray, isNil, isNumber, isString, isUndefined } from '@tsdi/ioc';
import { Decoder, Encoder, HeaderPacket, IReadableStream, IncomingHeaders, NotFoundExecption, Packet, SendOpts, StreamAdapter, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { AbstractTransportSession, TopicBuffer, ev, hdr, isBuffer, toBuffer } from '@tsdi/transport';
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

export class KafkaTransportSession extends AbstractTransportSession<KafkaTransport, KafkaTransportOpts> {

    protected topics: Map<string, TopicBuffer> = new Map();

    private regTopics?: RegExp[];


    protected override getBindEvents(): string[] {
        return EMPTY
    }

    protected override bindMessageEvent() {

    }

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
            eachMessage: (payload) => this.onData(payload)
        })
    }

    protected async onData(msg: EachMessagePayload): Promise<void> {
        try {
            const topic = msg.topic;
            if (this.options.serverSide && topic.endsWith('.reply')) return;
            let chl = this.topics.get(topic);

            if (!chl) {
                chl = {
                    topic,
                    buffer: null,
                    contentLength: this.getPayloadLength(msg.message as any), // ~~(msg.message.headers?.[hdr.CONTENT_LENGTH]?.toString() ?? '0'),
                    pkgs: new Map()
                }
                this.topics.set(topic, chl)
            }
            const id = msg.message.headers?.[KafkaHeaders.CORRELATION_ID]?.toString() as string;
            if (!chl.pkgs.has(id)) {
                const headers: IncomingHeaders = {};
                if (msg.message.headers) {
                    Object.keys(msg.message.headers).forEach(k => {
                        headers[k] = this.parseHead(msg.message.headers![k])
                    })
                }
                chl.pkgs.set(id, {
                    id,
                    headers,
                    topic,
                    url: topic
                })
            }
            this.handleData(chl, id, msg.message.value!);
        } catch (ev) {
            const e = ev as any;
            this.emit(e.ERROR, e.message);
        }
    }

    protected pipeStream(payload: IReadableStream, headers: HeaderPacket, options?: SendOpts | undefined): Promise<void> {
        throw new Error('Method not implemented.');
    }

    protected async generate(payload: any, packet: HeaderPacket, options?: SendOpts): Promise<Buffer> {
        const headers = packet.headers!;
        let body: Buffer;
        if (isString(payload)) {
            body = Buffer.from(payload);
        } else if (Buffer.isBuffer(payload)) {
            body = payload;
        } else if (this.streamAdapter.isReadable(payload)) {
            body = await toBuffer(payload);
        } else {
            body = Buffer.from(JSON.stringify(payload));
        }

        if (!headers[hdr.CONTENT_LENGTH]) {
            headers[hdr.CONTENT_LENGTH] = Buffer.byteLength(body);
        }

        if (this.encoder) {
            body = this.encoder.encode(body);
            if (isString(body)) body = Buffer.from(body);
            headers[hdr.CONTENT_LENGTH] = Buffer.byteLength(body);
        }

        return body;
    }

    protected async generateNoPayload(packet: HeaderPacket, options?: SendOpts): Promise<Buffer> {
        return Buffer.alloc(0);
    }

    write(buffer: Buffer, packet: Packet<any> & { partition?: number }, callback: (err?: any) => void) {
        const headers: IHeaders = {};
        Object.keys(packet.headers!).forEach(k => {
            headers[k] = this.generHead(packet.headers![k]);
        });
        headers[KafkaHeaders.CORRELATION_ID] = `${packet.id}`;
        const topic = packet.topic ?? packet.url!;
        if (!this.options.serverSide) {
            const replyTopic = packet.replyTo ?? this.getReplyTopic(topic);
            headers[KafkaHeaders.REPLY_TOPIC] = Buffer.from(replyTopic);
            if (this.options.consumerAssignments && !isNil(this.options.consumerAssignments[replyTopic])) {
                headers[KafkaHeaders.REPLY_PARTITION] = Buffer.from(this.options.consumerAssignments[replyTopic].toString());
            } else if (!this.regTopics?.some(i => i.test(replyTopic))) {
                throw new NotFoundExecption(replyTopic + ' has not registered.', this.socket.vaildator.notFound);
            }
        }

        this.socket.producer.send({
            ...this.options.send,
            topic,
            messages: [{
                headers,
                value: buffer,
                partition: packet.partition
            }]
        })
            .then(() => callback())
            .catch(err => callback(err))
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

    protected handleFailed(error: any): void {
        this.emit(ev.ERROR, error.message)
    }

    protected onSocket(name: string, event: (...args: any[]) => void): void {
        throw new Error('Method not implemented.');
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        throw new Error('Method not implemented.');
    }

    protected handleData(chl: TopicBuffer, id: string, dataRaw: string | Buffer) {

        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);
        const buffer = chl.buffer = chl.buffer ? Buffer.concat([chl.buffer, data], chl.buffer.length + data.length) : Buffer.from(data);

        if (chl.contentLength !== null) {
            const length = buffer.length;
            if (length === chl.contentLength) {
                this.handleMessage(chl, id, chl.buffer);
            } else if (length > chl.contentLength) {
                const message = chl.buffer.subarray(0, chl.contentLength);
                const rest = chl.buffer.subarray(chl.contentLength);
                this.handleMessage(chl, id, message);
                this.handleData(chl, id, rest);
            }
        }
    }

    protected handleMessage(chl: TopicBuffer, id: string, message: any) {
        chl.contentLength = null;
        chl.buffer = null;
        this.emitMessage(chl, id, message);
    }

    protected emitMessage(chl: TopicBuffer, id: string, chunk: Buffer) {
        const data = this.decoder ? this.decoder.decode(chunk) as Buffer : chunk;
        const pkg = chl.pkgs.get(id);
        if (pkg) {
            pkg.payload = data.length ? data : null;
            chl.pkgs.delete(id);
            this.emit(ev.MESSAGE, chl.topic, pkg);
        }
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

