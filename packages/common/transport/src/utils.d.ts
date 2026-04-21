import { IReadable } from '@tsdi/common';
/**
 * isBuffer or not.
 * @param target
 * @returns
 */
export declare function isBuffer(target: any): target is Buffer;
/**
 * to buffer.
 * @param body
 * @param limit
 * @param url
 * @returns
 */
export declare function toBuffer(body: IReadable, limit?: number, url?: string): Promise<Buffer<ArrayBuffer>>;
