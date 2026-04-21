"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET = exports.PACKET_IDLEN = exports.PACKET_LIMIT = exports.PACKET_LENGTH = exports.PACKET_MAXSIZE = exports.PACKET_DELIMITER = exports.TEXT_DECODER = void 0;
const ioc_1 = require("@tsdi/ioc");
exports.TEXT_DECODER = new ioc_1.ContextToken(() => new TextDecoder());
exports.PACKET_DELIMITER = new ioc_1.ContextToken(() => '\n');
exports.PACKET_MAXSIZE = new ioc_1.ContextToken(() => 0);
exports.PACKET_LENGTH = new ioc_1.ContextToken(() => 0);
exports.PACKET_LIMIT = new ioc_1.ContextToken(() => 1024 * 1024);
exports.PACKET_IDLEN = new ioc_1.ContextToken(() => 2);
exports.SOCKET = (0, ioc_1.token)('SOCKET');
//# sourceMappingURL=context.js.map