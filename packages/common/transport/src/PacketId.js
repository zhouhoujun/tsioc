"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PacketNumberIdGenerator = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const number_allocator_1 = require("number-allocator");
let PacketNumberIdGenerator = class PacketNumberIdGenerator {
    constructor() {
        this.idLenght = 2;
    }
    getPacketId() {
        if (!this.allocator) {
            this.allocator = new number_allocator_1.NumberAllocator(1, 65536);
        }
        const id = this.allocator.alloc();
        if (!id) {
            throw new ioc_1.Exception('alloc stream id failed');
        }
        this.last = id;
        return id;
    }
    readId(raw) {
        return raw.readInt16BE(0);
    }
};
exports.PacketNumberIdGenerator = PacketNumberIdGenerator;
exports.PacketNumberIdGenerator = PacketNumberIdGenerator = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], PacketNumberIdGenerator);
//# sourceMappingURL=PacketId.js.map