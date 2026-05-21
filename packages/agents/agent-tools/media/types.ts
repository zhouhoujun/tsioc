export interface PdfReadPage {
    pageNumber: number;
    text: string;
}

export interface PdfReadResult {
    pageCount: number;
    pages: PdfReadPage[];
}

export interface PdfReadAdapter {
    getPageCount(filePath: string): Promise<number>;
    read(filePath: string, options?: { pages?: number[]; }): Promise<PdfReadResult>;
}
