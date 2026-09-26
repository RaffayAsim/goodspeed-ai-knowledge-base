import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthenticatedUser } from '@kb/types';

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  accessToken: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Bearer token format');
    }

    const adminClient = this.supabaseService.getAdminClient();
    const { data: { user }, error } = await adminClient.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    // Attach user and raw token to request
    request.user = {
      id: user.id,
      email: user.email ?? '',
      role: user.role,
      userMetadata: user.user_metadata,
    } as AuthenticatedUser;
    request.accessToken = token;

    return true;
  }
}
