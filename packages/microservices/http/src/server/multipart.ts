import { BadRequestException, HttpStatusCode, UnsupportedMediaTypeException } from '@tsdi/common';

export interface HttpUploadFile {
    fieldName: string;
    filename: string;
    contentType?: string;
    encoding?: string;
    size: number;
    buffer: Buffer;
    headers: Record<string, string>;
}

export interface MultipartParseResult {
    body: Record<string, any>;
    fields: Record<string, string>;
    files: Record<string, HttpUploadFile>;
}

export function parseMultipartBody(buffer: Buffer, contentType?: string): MultipartParseResult {
    const boundary = getBoundary(contentType);
    const marker = `--${boundary}`;
    const source = buffer.toString('latin1');
    const parts = source.split(marker);
    if (parts.length < 3) {
        throw new BadRequestException('Invalid multipart body', HttpStatusCode.BadRequest);
    }

    const fields: Record<string, string> = {};
    const files: Record<string, HttpUploadFile> = {};
    for (const rawPart of parts.slice(1, -1)) {
        const part = trimPart(rawPart);
        if (!part) {
            continue;
        }
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd < 0) {
            throw new BadRequestException('Invalid multipart part', HttpStatusCode.BadRequest);
        }

        const headerText = part.slice(0, headerEnd);
        const contentText = trimTrailingCrlf(part.slice(headerEnd + 4));
        const headers = parseHeaders(headerText);
        const disposition = headers['content-disposition'];
        if (!disposition) {
            throw new BadRequestException('Missing content-disposition header', HttpStatusCode.BadRequest);
        }

        const name = getDispositionToken(disposition, 'name');
        if (!name) {
            throw new BadRequestException('Missing multipart field name', HttpStatusCode.BadRequest);
        }

        const filename = getDispositionToken(disposition, 'filename');
        const content = Buffer.from(contentText, 'latin1');
        if (filename) {
            files[name] = {
                fieldName: name,
                filename,
                contentType: headers['content-type'],
                encoding: headers['content-transfer-encoding'],
                size: content.length,
                buffer: content,
                headers,
            };
        } else {
            fields[name] = content.toString('utf8');
        }
    }

    return {
        fields,
        files,
        body: { ...fields, files },
    };
}

function getBoundary(contentType?: string): string {
    const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '');
    const boundary = match?.[1] ?? match?.[2];
    if (!boundary) {
        throw new UnsupportedMediaTypeException('Missing multipart boundary', HttpStatusCode.UnsupportedMediaType);
    }
    return boundary.trim();
}

function trimPart(part: string): string {
    let value = part;
    if (value.startsWith('\r\n')) {
        value = value.slice(2);
    }
    if (value.endsWith('--')) {
        value = value.slice(0, -2);
    }
    return trimTrailingCrlf(value);
}

function trimTrailingCrlf(value: string): string {
    return value.endsWith('\r\n') ? value.slice(0, -2) : value;
}

function parseHeaders(headerText: string): Record<string, string> {
    return headerText.split('\r\n').reduce((headers, line) => {
        const index = line.indexOf(':');
        if (index > 0) {
            headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
        }
        return headers;
    }, {} as Record<string, string>);
}

function getDispositionToken(disposition: string, key: string): string | undefined {
    const match = new RegExp(`${key}=(?:"([^"]*)"|([^;]+))`, 'i').exec(disposition);
    return (match?.[1] ?? match?.[2])?.trim();
}
