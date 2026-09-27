import { NextRequest, NextResponse } from 'next/server';

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
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
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
      } catch (pdfErr: any) {
        console.warn('PDF parsing error, falling back to text read:', pdfErr);
        content = (await file.text()).replace(/[^\x20-\x7E\n\r\t]/g, ' ');
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
