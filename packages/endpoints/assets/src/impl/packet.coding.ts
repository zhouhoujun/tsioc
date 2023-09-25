// import { EMPTY_OBJ, Inject, Injectable, isNil, isString, tokenId } from '@tsdi/ioc';
// import { AbstractDecoder, AbstractEncoder, Decoding, DecodingContext, Encoding, EncodingContext } from '../coding';
// import { hdr } from '../consts';


// export const HEADER_ENCODINGS = tokenId<Encoding[]>('HEADER_ENCODINGS');
// export const PAYLOAD_ENCODINGS = tokenId<Encoding[]>('PAYLOAD_ENCODINGS');


// @Injectable()
// export class InitSubpackageEncoding implements Encoding {
//     handle(ctx: EncodingContext, next: () => void): void {
//         if (isNil(ctx.input.payloadSize) && ctx.input.packet.headers) {
//             const len = ctx.input.packet.headers[hdr.CONTENT_LENGTH];
//             ctx.input.payloadSize = isString(len) ? ~~len : len ?? 0;
//         }
//         return next();
//     }
// }

// @Injectable()
// export class JsonHeadersEncoding implements Encoding {
//     handle(ctx: EncodingContext, next: () => void): void {
//         if (!ctx.input.header) {
//             const headerBuff = Buffer.from(JSON.stringify(ctx.input.packet.headers ?? EMPTY_OBJ));
//             ctx.input.header = headerBuff;
//             ctx.input.headerSize = Buffer.byteLength(headerBuff);
//             if (!ctx.input.payloadSize) {
//                 ctx.output = [headerBuff, null];
//                 return;
//             }
//         }
//         return next();
//     }
// }


// @Injectable()
// export class VaildPayloadEncoding implements Encoding {
//     handle(ctx: EncodingContext, next: () => void): void {
//         if (ctx.chunk) {
//             return next();
//         }
//     }
// }

// @Injectable()
// export class PayloadEncoding implements Encoding {
//     handle(ctx: EncodingContext, next: () => void): void {
//         const [data, rest] = ctx.input.push(ctx.chunk!, ctx.limit!);
//         if (data) {
//             const bufId = Buffer.alloc(2);
//             bufId.writeUInt16BE(ctx.input.packet.id);
//             const headSize = Buffer.alloc(2);
//             let result: Buffer;
//             if (!ctx.input.headerSent) {
//                 ctx.input.headerSent = true;
//                 headSize.writeUInt16BE(ctx.input.headerSize);
//                 result = Buffer.concat([Buffer.from(String(ctx.input.headerSize +  Buffer.byteLength(data) + 5)), ctx.delimiter, bufId, headSize, ctx.input.header, data])
//             } else {
//                 ctx.input.packet.id;
//                 headSize.writeUInt16BE(0);
//                 result = Buffer.concat([Buffer.from(String(Buffer.byteLength(data) + 5)), ctx.delimiter, bufId, headSize, ctx.input.header, data])
//             }
//             ctx.output = [result, rest];
//         }
//     }

// }




// export class PacketEncoder extends AbstractEncoder {

//     protected readonly encodings: Encoding[];

//     constructor(
//         @Inject(HEADER_ENCODINGS) headerEncodings: Encoding[],
//         @Inject(PAYLOAD_ENCODINGS) payloadEncodings: Encoding[]
//     ) {
//         super();

//         this.encodings = [...headerEncodings, ...payloadEncodings];
//     }

// }



// export const HEADER_DECODINGS = tokenId<Decoding[]>('HEADER_DECODINGS');
// export const PAYLOAD_DECODINGS = tokenId<Decoding[]>('PAYLOAD_DECODINGS');



// @Injectable()
// export class JsonHeadersDecoding implements Decoding {
//     handle(ctx: DecodingContext, next: () => void): void {

//         return next();
//     }
// }

// export class PacketDecoder extends AbstractDecoder {

//     protected readonly decodings: Decoding[];

//     constructor(
//         @Inject(HEADER_ENCODINGS) headerEncodings: Decoding[],
//         @Inject(PAYLOAD_ENCODINGS) payloadEncodings: Decoding[]
//     ) {
//         super();
//         this.decodings = [...headerEncodings, ...payloadEncodings];
//     }
// }
