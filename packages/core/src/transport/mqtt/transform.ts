import { ReadPacket, Serializer } from '@tsdi/core';
import { IClientPublishOptions } from 'mqtt';


export class MqttRecordSerializer implements Serializer<ReadPacket, ReadPacket & Partial<MqttRecord>>{
    serialize(packet: ReadPacket | any): ReadPacket & Partial<MqttRecord> {
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
