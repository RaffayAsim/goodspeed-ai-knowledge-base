import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TextChunk {
  index: number;
  content: string;
  tokenEstimate: number;
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);
  private readonly defaultChunkSize: number;
  private readonly defaultChunkOverlap: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultChunkSize = this.configService.get<number>('RAG_CHUNK_SIZE', 600);
    this.defaultChunkOverlap = this.configService.get<number>('RAG_CHUNK_OVERLAP', 100);
  }

  /**
   * Chunks a document content using a recursive markdown-aware strategy.
   * Splits hierarchically: Markdown headers -> Paragraphs -> Sentences -> Words.
   */
  chunkText(
    text: string,
    options?: { chunkSize?: number; chunkOverlap?: number },
  ): TextChunk[] {
    const chunkSize = options?.chunkSize ?? this.defaultChunkSize;
    const chunkOverlap = options?.chunkOverlap ?? this.defaultChunkOverlap;

    if (!text || text.trim().length === 0) {
      return [];
    }

    const cleanedText = text.replace(/\r\n/g, '\n').trim();

    // If text fits within single chunk, return immediately
    if (cleanedText.length <= chunkSize) {
      return [
        {
          index: 0,
          content: cleanedText,
          tokenEstimate: Math.ceil(cleanedText.length / 4),
        },
      ];
    }

    const rawChunks = this.splitRecursively(cleanedText, chunkSize, chunkOverlap);
    
    return rawChunks.map((content, index) => ({
      index,
      content: content.trim(),
      tokenEstimate: Math.ceil(content.length / 4),
    }));
  }

  private splitRecursively(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
  ): string[] {
    const separators = ['\n\n# ', '\n\n## ', '\n\n### ', '\n\n', '\n- ', '\n', '. ', ' '];
    return this.splitWithSeparators(text, chunkSize, chunkOverlap, separators);
  }

  private splitWithSeparators(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
    separators: string[],
  ): string[] {
    if (text.length <= chunkSize || separators.length === 0) {
      return [text];
    }

    const separator = separators[0];
    const nextSeparators = separators.slice(1);
    const splits = text.split(separator!);

    const chunks: string[] = [];
    let currentChunk = '';

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i]!;
      const candidate = currentChunk ? `${currentChunk}${separator}${split}` : split;

      if (candidate.length <= chunkSize) {
        currentChunk = candidate;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          // Apply overlap from end of current chunk
          const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
          const overlapText = currentChunk.substring(overlapStart);
          currentChunk = `${overlapText}${separator}${split}`;
        } else {
          // A single split exceeds chunkSize, recurse with finer separators
          const subChunks = this.splitWithSeparators(split, chunkSize, chunkOverlap, nextSeparators);
          chunks.push(...subChunks);
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}
