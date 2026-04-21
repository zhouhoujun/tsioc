"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomUuidGenerator = exports.UuidGenerator = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
let UuidGenerator = class UuidGenerator {
};
exports.UuidGenerator = UuidGenerator;
exports.UuidGenerator = UuidGenerator = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], UuidGenerator);
/**
 * default random uuid resolver.
 */
let RandomUuidGenerator = class RandomUuidGenerator {
    constructor() {
    }
    /**
     * generate uuid.
     *
     * @returns {string}
     * @memberof RandomUUID
     */
    generate() {
        return (this.randomS4() + this.randomS4() + '-' + this.randomS4() + '-' + this.randomS4() + '-' + this.randomS4() + '-' + this.randomS4() + this.randomS4() + this.randomS4());
    }
    randomS4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
};
exports.RandomUuidGenerator = RandomUuidGenerator;
exports.RandomUuidGenerator = RandomUuidGenerator = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], RandomUuidGenerator);
//# sourceMappingURL=uuid.js.map