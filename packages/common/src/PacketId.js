"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PacketUUIdGenerator = exports.PacketIdGenerator = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
let PacketIdGenerator = class PacketIdGenerator {
};
exports.PacketIdGenerator = PacketIdGenerator;
exports.PacketIdGenerator = PacketIdGenerator = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], PacketIdGenerator);
let PacketUUIdGenerator = class PacketUUIdGenerator {
    constructor(uuid) {
        this.uuid = uuid;
        this.idLenght = 36;
    }
    getPacketId() {
        return this.uuid.generate();
    }
    readId(raw) {
        return raw.subarray(0, this.idLenght).toString();
    }
};
exports.PacketUUIdGenerator = PacketUUIdGenerator;
exports.PacketUUIdGenerator = PacketUUIdGenerator = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [core_1.UuidGenerator])
], PacketUUIdGenerator);
//# sourceMappingURL=PacketId.js.map