"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBuffer = isBuffer;
exports.toBuffer = toBuffer;
const ioc_1 = require("@tsdi/ioc");
/**
 * isBuffer or not.
 * @param target
 * @returns
 */
function isBuffer(target) {
    return Buffer.isBuffer(target);
}
/**
 * to buffer.
 * @param body
 * @param limit
 * @param url
 * @returns
 */
async function toBuffer(body, limit = 0, url) {
    const data = [];
    let bytes = 0;
    for await (const chunk of body) {
        if (limit > 0 && bytes + chunk.length > limit) {
            const error = new ioc_1.TypeException(`content size at ${url} over limit: ${limit}`);
            body.destroy?.(error);
            throw error;
        }
        bytes += chunk.length;
        data.push(chunk);
    }
    return Buffer.concat(data, bytes);
}
//# sourceMappingURL=utils.js.map