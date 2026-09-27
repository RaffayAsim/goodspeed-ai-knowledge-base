import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function extractCanvaOrStructuredPdf(buffer: Buffer): string {
  const str = buffer.toString('binary');
  const matches: string[] = [];
  const regex = /\/(?:E|ActualText|Alt)\s*\(([^)]+)\)/g;
  let m;
  while ((m = regex.exec(str)) !== null) {
    const rawMatch = m[1];
    if (!rawMatch) continue;
    const val = rawMatch.replace(/\\\(/g, '(').replace(/\\\)/g, ')').trim();
    if (val.length > 0 && !matches.includes(val)) {
      matches.push(val);
    }
  }

  // Also check for standard Tj / TJ PDF text operators
  if (matches.length < 5) {
    const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    while ((m = tjRegex.exec(str)) !== null) {
      const rawMatch = m[1];
      if (!rawMatch) continue;
      const val = rawMatch.replace(/\\\(/g, '(').replace(/\\\)/g, ')').trim();
      if (val.length > 2 && !matches.includes(val) && !val.startsWith('/')) {
        matches.push(val);
      }
    }
  }

  return matches.join('\n\n');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const originalName = file.name || 'Uploaded Document';
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const title = originalName.replace(/\.[^/.]+$/, '');

    let content = '';

    if (['txt', 'md', 'markdown', 'csv', 'json', 'html'].includes(extension)) {
      content = await file.text();
    } else if (extension === 'pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());

      // Try 1: pdf-parse standard extractor
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse');
        if (pdfParse?.PDFParse) {
          const parser = new pdfParse.PDFParse({ data: buffer });
          const res = await parser.getText();
          content = res?.text?.trim() || '';
          if (typeof parser.destroy === 'function') await parser.destroy();
        } else if (typeof pdfParse === 'function') {
          const res = await pdfParse(buffer);
          content = res.text?.trim() || '';
        } else if (typeof pdfParse?.default === 'function') {
          const res = await pdfParse.default(buffer);
          content = res.text?.trim() || '';
        }
      } catch (pdfErr) {
        console.warn('pdf-parse standard extraction failed, attempting structured fallback:', pdfErr);
      }

      // Try 2: If standard extraction yielded empty/near-empty text (e.g. Canva PDF designs), extract structured accessibility text
      if (!content || content.length < 50) {
        const structuredText = extractCanvaOrStructuredPdf(buffer);
        if (structuredText && structuredText.length > 50) {
          content = structuredText;
        }
      }

      // Guard: Never allow raw binary postscript PDF bytes to be returned as content
      if (content.startsWith('%PDF') || !content) {
        return NextResponse.json(
          {
            message:
              'Could not extract text automatically from this PDF (it may contain scanned image graphics). Please copy and paste the document text directly.',
          },
          { status: 422 },
        );
      }
    } else {
      // Fallback text read
      content = await file.text();
    }

    return NextResponse.json({
      title,
      content: content.trim(),
      format: extension,
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Extraction failed: ${err.message}` },
      { status: 500 },
    );
  }
}
