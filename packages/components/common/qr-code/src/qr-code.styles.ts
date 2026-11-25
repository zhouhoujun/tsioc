import { installStyleSheet } from '../../src/styles';

export const QR_CODE_STYLE_ID = 'tsdi-qr-code-styles';

export const QR_CODE_CSS = `
.ui-qr-code { display: inline-flex; flex-direction: column; align-items: flex-start; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1; }
.ui-qr-row { display: block; white-space: pre; }
`;

export function installQrCodeStyles(doc?: Document | null): void {
    installStyleSheet(doc, QR_CODE_STYLE_ID, QR_CODE_CSS);
}
