import { TransportRequest, Serializer } from '@tsdi/core';
import { IClientPublishOptions } from 'mqtt';


export class MqttRecordSerializer implements Serializer<TransportRequest, TransportRequest & Partial<MqttRecord>>{
    serialize(packet: TransportRequest | any): TransportRequest & Partial<MqttRecord> {
        if (
            packet?.data &&
            typeof packet.data === 'object' &&
            packet.data instanceof MqttRecord
        ) {
            const record = packet.data as MqttRecord;
            return {
                ...packet,
                data: record.data,
                options: record.options,
            };
        }
        return packet;
    }
}


export class MqttRecord<TData = any> {
    constructor(
        public readonly data: TData,
        public options?: IClientPublishOptions,
    ) { }
}
