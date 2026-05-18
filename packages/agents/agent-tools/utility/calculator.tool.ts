import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class CalculatorTool implements AgentTool {
    name = 'calculator';
    description = 'Evaluate a safe arithmetic expression.';
    inputSchema = {
        type: 'object',
        properties: {
            expression: { type: 'string' }
        },
        required: ['expression']
    };
    toolset = 'utility';
    source = 'local';
    execution = { readOnly: true };

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        if (!input || typeof input.expression !== 'string' || !input.expression.trim()) {
            throw new Error('Invalid calculator input: expression must be a non-empty string.');
        }
        const parser = new ArithmeticParser(input.expression);
        return {
            expression: input.expression,
            value: parser.parse()
        };
    }
}

class ArithmeticParser {
    private index = 0;

    constructor(private readonly source: string) {
    }

    parse(): number {
        const value = this.parseExpression();
        this.skipWhitespace();
        if (this.index !== this.source.length) {
            throw new Error('Invalid arithmetic expression.');
        }
        return value;
    }

    private parseExpression(): number {
        let value = this.parseTerm();
        while (true) {
            this.skipWhitespace();
            const operator = this.source[this.index];
            if (operator !== '+' && operator !== '-') {
                return value;
            }
            this.index++;
            const rhs = this.parseTerm();
            value = operator === '+' ? value + rhs : value - rhs;
        }
    }

    private parseTerm(): number {
        let value = this.parseFactor();
        while (true) {
            this.skipWhitespace();
            const operator = this.source[this.index];
            if (operator !== '*' && operator !== '/') {
                return value;
            }
            this.index++;
            const rhs = this.parseFactor();
            if (operator === '/') {
                if (rhs === 0) {
                    throw new Error('Invalid arithmetic expression.');
                }
                value = value / rhs;
            } else {
                value = value * rhs;
            }
        }
    }

    private parseFactor(): number {
        this.skipWhitespace();
        const current = this.source[this.index];
        if (current === '(') {
            this.index++;
            const value = this.parseExpression();
            this.skipWhitespace();
            if (this.source[this.index] !== ')') {
                throw new Error('Invalid arithmetic expression.');
            }
            this.index++;
            return value;
        }
        if (current === '-') {
            this.index++;
            return -this.parseFactor();
        }
        return this.parseNumber();
    }

    private parseNumber(): number {
        this.skipWhitespace();
        const start = this.index;
        while (this.index < this.source.length && /[0-9.]/.test(this.source[this.index])) {
            this.index++;
        }
        if (start === this.index) {
            throw new Error('Invalid arithmetic expression.');
        }
        const value = Number(this.source.slice(start, this.index));
        if (!Number.isFinite(value)) {
            throw new Error('Invalid arithmetic expression.');
        }
        return value;
    }

    private skipWhitespace(): void {
        while (this.index < this.source.length && /\s/.test(this.source[this.index])) {
            this.index++;
        }
    }
}
