import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DocumentsService } from './documents.service';
import { DocumentExtractorService } from './document-extractor.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/create-document.dto';
import { AuthenticatedUser, IDocument } from '@kb/types';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly documentExtractorService: DocumentExtractorService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all documents for the authenticated user' })
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<IDocument[]> {
    return this.documentsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific document by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IDocument> {
    return this.documentsService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new document and trigger RAG chunking & embedding' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDocumentDto,
  ): Promise<IDocument> {
    return this.documentsService.create(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing document and re-sync vector embeddings' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDocumentDto,
  ): Promise<IDocument> {
    return this.documentsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a document and all associated vector chunks' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.documentsService.remove(id, user.id);
  }

  @Post('extract-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Extract text from any document format (PDF, DOCX, CSV, JSON, HTML, TXT, MD)' })
  @ApiConsumes('multipart/form-data')
  async extractFile(
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required in multipart/form-data under key "file"');
    }
    return this.documentExtractorService.extractText(file);
  }
}
