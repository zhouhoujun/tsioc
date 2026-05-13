export type AttachmentType = 'image' | 'audio' | 'video' | 'document' | 'file' | 'voice';

export interface Attachment {
    id: string;
    type: AttachmentType;
    url: string;
    name?: string;
    size?: number;
    mimeType?: string;
    metadata?: Record<string, any>;
}
