
export interface ReadPacket<T = any> {
    pattern: any;
    data: T;
}

export interface WritePacket<T = any> {
    err?: any;
    response?: T;
    isDisposed?: boolean;
    status?: string;
}


export type OutgoingRequest = Required<{id: string}> & ReadPacket
export type IncomingRequest = Required<{id: string}> & ReadPacket;
export type OutgoingEvent = ReadPacket;
export type IncomingEvent = ReadPacket;
export type IncomingResponse = Required<{id: string}> & WritePacket;
export type OutgoingResponse = Required<{id: string}> & WritePacket;