import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParseModule = require('pdf-parse');

export interface ExtractedDocument {
  title: string;
  content: string;
  format: string;
}

@Injectable()
export class DocumentExtractorService {
  private readonly logger = new Logger(DocumentExtractorService.name);

  async extractText(file: Express.Multer.File): Promise<ExtractedDocument> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded or file buffer is empty');
    }

    const originalName = file.originalname || 'Uploaded Document';
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const title = originalName.replace(/\.[^/.]+$/, '');

    this.logger.log(`Extracting text from file: ${originalName} (type: ${file.mimetype}, ext: ${extension})`);

    let content = '';

    try {
      switch (extension) {
        case 'pdf': {
          if (pdfParseModule?.PDFParse) {
            const parser = new pdfParseModule.PDFParse({ data: file.buffer });
            try {
              const res = await parser.getText();
              content = res?.text?.trim() || '';
            } finally {
              if (typeof parser.destroy === 'function') {
                await parser.destroy();
              }
            }
          if (!content || content.length < 50) {
            const str = file.buffer.toString('binary');
            const matches: string[] = [];
            const regex = /\/(?:E|ActualText|Alt)\s*\(([^)]+)\)/g;
            let m;
            while ((m = regex.exec(str)) !== null) {
              const val = m[1].replace(/\\\(/g, '(').replace(/\\\)/g, ')').trim();
              if (val.length > 0 && !matches.includes(val)) {
                matches.push(val);
              }
            }
            if (matches.length > 0) {
              content = matches.join('\n\n');
            }
          }
          break;
        }

        case 'docx': {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          content = result.value?.trim() || '';
          break;
        }

        case 'csv':
        case 'tsv': {
          const raw = file.buffer.toString('utf-8');
          content = this.formatDelimitedText(raw, extension === 'tsv' ? '\t' : ',');
          break;
        }

        case 'json': {
          const raw = file.buffer.toString('utf-8');
          try {
            const parsed = JSON.parse(raw);
            content = JSON.stringify(parsed, null, 2);
          } catch {
            content = raw;
          }
          break;
        }

        case 'html':
        case 'htm': {
          const raw = file.buffer.toString('utf-8');
          // Strip scripts and styles, then extract text
          content = raw
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          break;
        }

        case 'txt':
        case 'md':
        case 'markdown':
        case 'log':
        case 'rtf':
        default: {
          content = file.buffer.toString('utf-8').trim();
          break;
        }
      }

      if (!content || content.length === 0) {
        throw new BadRequestException('Could not extract any readable text from this document.');
      }

      return {
        title,
        content,
        format: extension || 'text',
      };
    } catch (err: any) {
      this.logger.error(`Failed to parse ${originalName}: ${err.message}`, err.stack);
      throw new BadRequestException(`Document parsing failed: ${err.message}`);
    }
  }

  private formatDelimitedText(raw: string, delimiter: string): string {
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return raw;

    const headers = lines[0]!.split(delimiter).map((h) => h.trim());
    const markdownLines: string[] = [];

    markdownLines.push(`| ${headers.join(' | ')} |`);
    markdownLines.push(`| ${headers.map(() => '---').join(' | ')} |`);

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]!.split(delimiter).map((c) => c.trim());
      markdownLines.push(`| ${row.join(' | ')} |`);
    }

    return markdownLines.join('\n');
  }
}
