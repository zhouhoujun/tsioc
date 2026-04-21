"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCatch = exports.PAYLOAD_KEY = exports.TransferFeatureKind = exports.TransferSide = void 0;
exports.makeTransferFeature = makeTransferFeature;
exports.useSimpleJson = useSimpleJson;
const ioc_1 = require("@tsdi/ioc");
const rxjs_1 = require("rxjs");
const context_1 = require("./context");
const StreamAdapter_1 = require("./StreamAdapter");
const logger_1 = require("@tsdi/logger");
var TransferSide;
(function (TransferSide) {
    TransferSide[TransferSide["client"] = 1] = "client";
    TransferSide[TransferSide["server"] = 2] = "server";
})(TransferSide || (exports.TransferSide = TransferSide = {}));
var TransferFeatureKind;
(function (TransferFeatureKind) {
    TransferFeatureKind[TransferFeatureKind["UnPacket"] = 0] = "UnPacket";
    TransferFeatureKind[TransferFeatureKind["Decode"] = 1] = "Decode";
    TransferFeatureKind[TransferFeatureKind["Deserialize"] = 2] = "Deserialize";
    TransferFeatureKind[TransferFeatureKind["Serialize"] = 3] = "Serialize";
    TransferFeatureKind[TransferFeatureKind["Encode"] = 4] = "Encode";
    TransferFeatureKind[TransferFeatureKind["Packet"] = 5] = "Packet";
})(TransferFeatureKind || (exports.TransferFeatureKind = TransferFeatureKind = {}));
function makeTransferFeature(kind, providers, config) {
    return {
        kind,
        config,
        providers
    };
}
exports.PAYLOAD_KEY = new ioc_1.ContextToken(() => 'body');
const useCatch = (req, next, context) => {
    return next(req, context)
        .pipe((0, rxjs_1.catchError)(err => {
        const logger = context.get(logger_1.Logger);
        logger ? logger.error(err) : console.error(err);
        return (0, rxjs_1.of)(null);
    }));
};
exports.useCatch = useCatch;
function useSimpleJson(options) {
    return (config) => {
        const interceptor = config.side === TransferSide.client ? (req, next, context) => {
            const reqdata = JSON.stringify(options?.mapping ? options.mapping(req, context) : req, options?.replacer, options?.space);
            return next(reqdata, context)
                .pipe((0, rxjs_1.mergeMap)(async (res) => {
                const streamAdapter = context.get(StreamAdapter_1.StreamAdapter);
                if (streamAdapter.isReadable(res)) {
                    res = await streamAdapter.read(res);
                }
                const incoming = JSON.parse(res, options?.reviver);
                if ((0, ioc_1.isDefined)(incoming?.payload))
                    incoming.body = incoming.payload;
                return incoming;
            }));
        }
            :
                (req, next, context) => {
                    return (0, rxjs_1.defer)(async () => {
                        const streamAdapter = context.get(StreamAdapter_1.StreamAdapter);
                        if (streamAdapter.isReadable(req)) {
                            req = await streamAdapter.read(req);
                        }
                        const incoming = JSON.parse(req, options?.reviver);
                        if ((0, ioc_1.isDefined)(incoming?.payload))
                            incoming.body = incoming.payload;
                        return incoming;
                    })
                        .pipe((0, rxjs_1.mergeMap)(rjson => {
                        context.set(context_1.REQUEST, rjson);
                        return next(rjson, context);
                    }), (0, rxjs_1.map)(res => JSON.stringify(options?.mapping ? options?.mapping(res, context) : res, options?.replacer, options?.space)));
                };
        return interceptor;
    };
}
//# sourceMappingURL=transfer.js.map