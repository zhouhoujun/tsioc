
export interface ReadPacket<T = any> {
    pattern: any;
    data: T;
}

export interface WritePacket<T = any> {
    err?: any;
    error?: Error;
    response?: T;
    disposed?: boolean;
    status?: string | number;
    ok?: boolean;
    body?: any;
}

export type TrasportEvent = ReadPacket;
export type TrasportRequest = Required<{ id: string }> & ReadPacket;
export type TrasportResponse = Required<{ id: string }> & WritePacket;
