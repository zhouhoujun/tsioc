"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamAdapter = void 0;
const ioc_1 = require("@tsdi/ioc");
const events_1 = require("./events");
// import { Buffer } from 'buffer';
// /**
//  * isBuffer or not.
//  * @param target 
//  * @returns 
//  */
// export function isBuffer(target: any): target is Buffer {
//     return Buffer.isBuffer(target);
// }
// /**
//  * to buffer.
//  * @param body 
//  * @param limit 
//  * @param url 
//  * @returns 
//  */
// export async function toBuffer(body: IReadable, limit = 0, url?: string) {
//     const data = [];
//     let bytes = 0;
//     for await (const chunk of body) {
//         if (limit > 0 && bytes + chunk.length > limit) {
//             const error = new TypeException(`content size at ${url} over limit: ${limit}`);
//             body.destroy?.(error);
//             throw error;
//         }
//         bytes += chunk.length;
//         data.push(chunk);
//     }
//     return Buffer.concat(data, bytes);
// }
/**
 * stream adapter
 */
class StreamAdapter {
    merge(writable, ...args) {
        const sources = (args.length == 1 && (0, ioc_1.isArray)(args[0])) ? args[0] : args;
        if (!sources.length) {
            writable.end();
            return;
        }
        const source = sources.shift();
        source.once(events_1.Events.ERROR, (err) => {
            source.removeAllListeners();
            writable.emit(events_1.Events.ERROR, err);
        });
        source.once(events_1.Events.END, () => {
            source.removeAllListeners();
            this.merge(writable, sources);
        });
        source.pipe(writable, { end: false });
    }
}
exports.StreamAdapter = StreamAdapter;
//# sourceMappingURL=StreamAdapter.js.map