import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthenticatedUser, IConversation } from '@kb/types';
import { OpenAiCompatibleProvider } from '../ai-provider/openai-compatible.provider';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly openAiProvider: OpenAiCompatibleProvider,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations for current user' })
  async listConversations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IConversation[]> {
    return this.chatService.listConversations(user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details and messages' })
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IConversation> {
    return this.chatService.getConversation(id, user.id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete conversation' })
  async deleteConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.chatService.deleteConversation(id, user.id);
  }

  @Post('message')
  @ApiOperation({ summary: 'Send message and receive complete response with citations' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.id, dto);
  }

  @Post('stream')
  @ApiOperation({ summary: 'Stream AI chat response via Server-Sent Events (SSE)' })
  async streamMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    return this.chatService.streamMessage(user.id, dto, res);
  }

  @Get('provider-info')
  @ApiOperation({ summary: 'Get active AI provider and model metadata' })
  getProviderInfo() {
    return this.openAiProvider.getProviderInfo();
  }
}
