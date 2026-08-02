import { promises as fs } from 'fs';

export interface FileSnapshotCapture {
    filePath: string;
    before: string | null;
}

export async function readFileSnapshot(filePath: string): Promise<FileSnapshotCapture> {
    try {
        return { filePath, before: await fs.readFile(filePath, 'utf8') };
    } catch (error: any) {
        if (error?.code === 'ENOENT') {
            return { filePath, before: null };
        }
        throw error;
    }
}
