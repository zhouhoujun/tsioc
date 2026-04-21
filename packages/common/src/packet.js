"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writePacket = writePacket;
const ioc_1 = require("@tsdi/ioc");
function writePacket(socket, msg, streamAdapter) {
    if (streamAdapter.isReadable(msg)) {
        return streamAdapter.pipeTo(msg, socket, { end: false });
    }
    return (0, ioc_1.promisify)(socket.write, socket)(msg);
}
//# sourceMappingURL=packet.js.map