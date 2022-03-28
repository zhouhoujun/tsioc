import { TransportRequest } from '@tsdi/core';
import { type_obj } from '@tsdi/ioc';
import { IClientPublishOptions } from 'mqtt';


export class MqttRecordSerializer {
    serialize(packet: TransportRequest | any): TransportRequest & Partial<MqttRecord> {
        if (
            packet?.data &&
            typeof packet.data === type_obj &&
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
