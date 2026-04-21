"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useJsonPacket = useJsonPacket;
const common_1 = require("@tsdi/common");
const interceptors_1 = require("./interceptors");
const ioc_1 = require("@tsdi/ioc");
const PacketId_1 = require("./PacketId");
const defaultOptions = {
    delimiter: '\r\n',
    idSize: 2,
    packetId: PacketId_1.PacketNumberIdGenerator
};
const requestMapping = (req, context) => {
    if (req instanceof common_1.AbstractRequest) {
        return req.toJson({ formatter: context.get(common_1.PatternFormatter) });
    }
    return req;
};
const outgoingMapping = (res, context) => {
    if (res instanceof common_1.AbstractOutgoing) {
        return res.toJson();
    }
    return res;
};
function useJsonPacket(options = {}) {
    return (config) => {
        options = { ...defaultOptions, ...config.transfer, ...options };
        const isClient = config.side == common_1.TransferSide.client;
        if (!options.mapping) {
            options.mapping = isClient ? requestMapping : outgoingMapping;
        }
        if (isClient) {
            if (!config.providers) {
                config.providers = [];
            }
            config.providers.push((0, ioc_1.toProvider)(common_1.PacketIdGenerator, options.packetId));
        }
        return isClient ? [
            common_1.useCatch,
            (0, interceptors_1.packetIdMessage)(config, options),
            (0, common_1.useSimpleJson)(options)(config),
            (0, interceptors_1.delimiterUnpacket)(config, options),
            (0, interceptors_1.delimiterPacket)(config, options),
            (0, interceptors_1.socketMessage)(config, options)
        ] : [
            common_1.useCatch,
            (0, interceptors_1.socketMessage)(config, options),
            (0, interceptors_1.delimiterUnpacket)(config, options),
            (0, interceptors_1.delimiterPacket)(config, options),
            (0, common_1.useSimpleJson)(options)(config),
            (0, interceptors_1.packetIdMessage)(config, options)
        ];
    };
}
//# sourceMappingURL=providers.js.map