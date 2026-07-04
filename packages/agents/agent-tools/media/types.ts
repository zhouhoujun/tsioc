import { Abstract } from '@tsdi/ioc';

export interface PdfReadPage {
    pageNumber: number;
    text: string;
}

export interface PdfReadResult {
    pageCount: number;
    pages: PdfReadPage[];
}

@Abstract()
export abstract class PdfReadAdapter {
    abstract getPageCount(filePath: string): Promise<number>;
    abstract read(filePath: string, options?: { pages?: number[]; }): Promise<PdfReadResult>;
}
