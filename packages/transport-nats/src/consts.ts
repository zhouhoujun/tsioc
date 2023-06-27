import { tokenId } from '@tsdi/ioc';
import { NatsConnection } from 'nats';

export const NATS_CONNECTION = tokenId<NatsConnection>('NATS_CONNECTION');
