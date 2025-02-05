import Redis from 'ioredis';

export interface ReidsSocket {
    publisher: Redis;
    subscriber: Redis;
}