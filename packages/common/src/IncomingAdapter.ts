import { Abstract } from '@tsdi/ioc';
import { IncomingHeader } from './headers';
import { StatusCode } from './packet';


@Abstract()
export abstract class IncomingAdapter<TPacket = any> {
    /**
     * has content type or not.
     */
    abstract hasContentType(packet: TPacket): boolean;
    /**
     * content type.
     */
    abstract getContentType(packet: TPacket): string;

    /**
     * Get Content-Encoding.
     * @param packet
     */
    abstract getContentEncoding(packet: TPacket): string;
    /**
     * Get packet content length
     *
     * @return {Number}
     * @api public
     */
    abstract getContentLength(packet: TPacket): number | undefined;

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    abstract hasHeader(packet: TPacket, field: string): IncomingHeader;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    abstract getHeader(packet: TPacket, field: string): IncomingHeader;

    /**
     * Get packet status code.
     *
     * @return {StatusCode}
     * @api public
     */
    abstract getStatus(packet: TPacket): StatusCode;
    /**
     * Get packet status message.
     *
     * @return {String}
     * @api public
     */
    abstract getStatusText(packet: TPacket): string;
    /**
     * Get packet content
     *
     * @return {Number}
     * @api public
     */
    abstract getContent(packet: TPacket): any;

    abstract getAcceptType(packet: TPacket, ...contentTypes: string[]): string[];

    abstract getAcceptCharset(packet: TPacket, ...charsets: string[]): string[];

    abstract getAcceptEncoding(packet: TPacket, ...encodings: string[]): string[];

    abstract getAcceptLanguage(packet: TPacket, ...languages: string[]): string[];

    abstract getReferrer?(packet: TPacket): string;
    abstract getLocation(packet: TPacket): string;

}
