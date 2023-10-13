import { Execption, Injectable, isArray, isNil, isNumber, isString, isUndefined } from '@tsdi/ioc';
import { UuidGenerator } from '@tsdi/core';
import { BadRequestExecption, IncomingHeaders, NotFoundExecption, OfflineExecption, OutgoingHeaders, Packet, Receiver, RequestPacket, ResponsePacket, Sender, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev, hdr, isBuffer } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { EventEmitter } from 'events';
import { Observable, filter, fromEvent, map, throwError } from 'rxjs';
import { AssignerProtocol, Cluster, ConsumerRunConfig, EachMessagePayload, GroupMember, GroupMemberAssignment, GroupState, MemberMetadata, ConsumerSubscribeTopics, ProducerRecord, IHeaders } from 'kafkajs';
import { KafkaHeaders, KafkaTransport, KafkaTransportOpts } from './const';


export class KafkaTransportSession extends AbstractTransportSession<KafkaTransport, EachMessagePayload> {


    private regTopics?: RegExp[];
    private events = new EventEmitter();

    constructor(
        socket: KafkaTransport,
        sender: Sender,
        receiver: Receiver,
        private uuidGenner: UuidGenerator,
        options?: KafkaTransportOpts) {
        super(socket, sender, receiver, options)
    }


    async bindTopics(topics: (string | RegExp)[]) {
        const consumer = this.socket.consumer;
        if (!consumer) throw new Execption('No consumer');
        await consumer.subscribe({
            topics,
            ... (this.options as KafkaTransportOpts).subscribe,
        });

        this.regTopics = topics.filter(t => t instanceof RegExp) as RegExp[];

        await consumer.run({
            // autoCommit: true,
            // autoCommitInterval: 5000,
            // autoCommitThreshold: 100,
            ...(this.options as KafkaTransportOpts).run,
            eachMessage: async (payload) => {
                if (this.options.serverSide && payload.topic.endsWith('.reply')) return;
                this.events.emit(ev.MESSAGE, payload);
            }
        })
    }

    protected async write(data: Buffer, packet: Packet & { partition: number, kafkaheaders: IHeaders }): Promise<void> {

        const opts = this.options as KafkaTransportOpts;
        const topic = opts.serverSide ? this.getReply(packet) : packet.topic;
        if (!topic) throw new BadRequestExecption();
        
        const headers: IHeaders = {};
        Object.keys(packet.headers!).forEach(k => {
            headers[k] = this.generHead(packet.headers![k]);
        });
        headers[KafkaHeaders.CORRELATION_ID] = `${packet.id}`;
        if (!opts.serverSide) {
            const replyTopic = this.getReply(packet);
            headers[KafkaHeaders.REPLY_TOPIC] = Buffer.from(replyTopic);
            if (opts.consumerAssignments && !isNil(opts.consumerAssignments[replyTopic])) {
                headers[KafkaHeaders.REPLY_PARTITION] = Buffer.from(opts.consumerAssignments[replyTopic].toString());
            } else if (!this.regTopics?.some(i => i.test(replyTopic))) {
                throw new NotFoundExecption(replyTopic + ' has not registered.', this.socket.vaildator?.notFound);
            }
        }

        this.socket.producer.send({
            ...opts.send,
            topic,
            messages: [{
                headers: packet.kafkaheaders,
                value: data ?? Buffer.alloc(0),
                partition: packet.partition
            }]
        })
            // .then(() => callback?.())
            // .catch(err => {
            //     this.handleFailed(err);
            //     callback?.(err)
            // })
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

    protected override async beforeRequest(packet: RequestPacket<any>): Promise<void> {
        if (!this.options.serverSide) {
            packet.replyTo = this.getReply(packet);
        }
    }



    protected mergeClose(source: Observable<any>): Observable<any> {
        return source;
        // return this.socket.isClosed() ? throwError(() => new OfflineExecption()) : source;
    }

    protected reqMsgFilter(req: RequestPacket<any>, msg: EachMessagePayload): boolean {
        return req.replyTo === msg.topic
    }

    protected override reqResFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return req.id === res.id;
    }

    protected override message() {
        return fromEvent(this.events, ev.MESSAGE, (msg: EachMessagePayload) => {
            return msg
        }).pipe(
            filter(msg => this.options.serverSide ? !msg.topic.endsWith('.reply') : true)
        )
    }

    protected override pack(packet: Packet<any>): Observable<Buffer> {
        const { replyTo, topic, id, headers, ...data } = packet;
        return this.sender.send(data);
    }

    protected override unpack(msg: EachMessagePayload): Observable<Packet> {
        const headers = this.getIncomingHeaders(msg);
        const id = headers[KafkaHeaders.CORRELATION_ID];
        return this.receiver.receive(msg.message.value ?? Buffer.alloc(0))
            .pipe(
                map(payload => {
                    return {
                        id,
                        topic: msg.topic,
                        replyTo: msg.partition,
                        headers,
                        ...payload
                    } as Packet
                })
            )
    }

    protected getReply(packet: Packet) {
        return packet.replyTo ?? packet.topic + '.reply';
    }

    protected override getPacketId(): string {
        return this.uuidGenner.generate()
    }

    async destroy(): Promise<void> {
    }
}

@Injectable()
export class KafkaTransportSessionFactory implements TransportSessionFactory<KafkaTransport> {

    constructor(private factory: TransportFactory,
        private uuidGenner: UuidGenerator) { }

    create(socket: KafkaTransport, transport: Transport, options?: TransportOpts): KafkaTransportSession {
        return new KafkaTransportSession(socket, this.factory.createSender(transport, options), this.factory.createReceiver(transport, options), this.uuidGenner, options);
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