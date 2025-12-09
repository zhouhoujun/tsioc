import { TypeException } from '@tsdi/ioc';
import { IReadable } from '@tsdi/common';



/**
 * isBuffer or not.
 * @param target 
 * @returns 
 */
export function isBuffer(target: any): target is Buffer {
    return Buffer.isBuffer(target);
}

/**
 * to buffer.
 * @param body 
 * @param limit 
 * @param url 
 * @returns 
 */
export async function toBuffer(body: IReadable, limit = 0, url?: string) {
    const data = [];
    let bytes = 0;

    for await (const chunk of body) {
        if (limit > 0 && bytes + chunk.length > limit) {
            const error = new TypeException(`content size at ${url} over limit: ${limit}`);
            body.destroy?.(error);
            throw error;
        }
        bytes += chunk.length;
        data.push(chunk);
    }

    return Buffer.concat(data, bytes);
}
