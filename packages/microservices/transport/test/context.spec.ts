import expect = require('expect');
import { TEXT_DECODER, PACKET_DELIMITER, PACKET_MAXSIZE, PACKET_LENGTH, PACKET_LIMIT, PACKET_IDLEN, SOCKET } from '../src/context';

describe('transport context tokens', () => {
    it('TEXT_DECODER is defined with default value', () => {
        expect(TEXT_DECODER).toBeDefined();
        const decoder = TEXT_DECODER.defaultValue();
        expect(decoder).toBeInstanceOf(TextDecoder);
    });

    it('PACKET_DELIMITER defaults to newline', () => {
        expect(PACKET_DELIMITER).toBeDefined();
        expect(PACKET_DELIMITER.defaultValue()).toBe('\n');
    });

    it('PACKET_MAXSIZE defaults to 0', () => {
        expect(PACKET_MAXSIZE).toBeDefined();
        expect(PACKET_MAXSIZE.defaultValue()).toBe(0);
    });

    it('PACKET_LENGTH defaults to 0', () => {
        expect(PACKET_LENGTH).toBeDefined();
        expect(PACKET_LENGTH.defaultValue()).toBe(0);
    });

    it('PACKET_LIMIT defaults to 1MB', () => {
        expect(PACKET_LIMIT).toBeDefined();
        expect(PACKET_LIMIT.defaultValue()).toBe(1024 * 1024);
    });

    it('PACKET_IDLEN defaults to 2', () => {
        expect(PACKET_IDLEN).toBeDefined();
        expect(PACKET_IDLEN.defaultValue()).toBe(2);
    });

    it('SOCKET is a defined token', () => {
        expect(SOCKET).toBeDefined();
        expect(typeof SOCKET.toString).toBe('function');
    });
});
