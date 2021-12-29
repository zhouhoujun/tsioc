
export interface ReadPacket<T = any> {
    pattern: any;
    data: T;
}

export interface WritePacket<T = any> {
    err?: any;
    response?: T;
    disposed?: boolean;
    status?: string | number;
}

export type TrasportEvent = ReadPacket;
export type TrasportRequest = Required<{ id: string }> & ReadPacket;
export type TrasportResponse = Required<{ id: string }> & WritePacket;
