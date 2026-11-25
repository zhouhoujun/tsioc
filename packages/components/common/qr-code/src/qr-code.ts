import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { installQrCodeStyles } from './qr-code.styles';

/**
 * QR matrix renderer (Ant Design QRCode display half).
 *
 * Encoding stays with the host (the common layer cannot depend on Node or a
 * QR library). The precomputed matrix is painted with the same module glyphs in
 * browsers and terminals, optionally surrounded by a quiet zone.
 */
@Component({
    selector: 'ui-qr-code',
    template: `
    <div class="ui-qr-code {{qrClass}}" role="img" aria-label="{{ariaLabel}}"
        [style]="rootStyle">
        <span class="ui-qr-row" v-for="row in viewRows" trackBy="index">{{row}}</span>
    </div>`
})
export class QrCodeComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installQrCodeStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() matrix: Array<Array<boolean | number | string>> | string[] = [];
    @Attribute() ariaLabel = 'QR code';
    @Attribute() on = '██';
    @Attribute() off = '  ';
    @Attribute() quietZone: number | string = 0;
    @Attribute() className = '';

    get qrClass(): string {
        return this.className;
    }

    get rootStyle(): Record<string, string> {
        return {
            'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
            'line-height': '1'
        };
    }

    get viewRows(): string[] {
        const quiet = Math.max(0, Math.min(8, Math.floor(Number(this.quietZone) || 0)));
        const rows = this.normalizedRows();
        const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
        const padded = rows.map(row => {
            const cells = [...row, ...Array.from({ length: Math.max(0, width - row.length) }, () => false)];
            return [...Array.from({ length: quiet }, () => false), ...cells, ...Array.from({ length: quiet }, () => false)]
                .map(cell => cell ? this.on : this.off).join('');
        });
        const empty = Array.from({ length: width + quiet * 2 }, () => this.off).join('');
        return [
            ...Array.from({ length: quiet }, () => empty),
            ...padded,
            ...Array.from({ length: quiet }, () => empty)
        ];
    }

    protected normalizedRows(): boolean[][] {
        const matrix = Array.isArray(this.matrix) ? this.matrix : [];
        return matrix.map(row => {
            if (typeof row === 'string') {
                return Array.from(row).map(cell => cell !== ' ' && cell !== '0' && cell !== '.');
            }
            return (Array.isArray(row) ? row : []).map(cell =>
                cell === true || cell === 1 || cell === '1' || cell === '█');
        });
    }
}
