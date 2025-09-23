<<<<<<< HEAD
import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.services';
=======
import { 
  Controller, 
  Post, 
  Body, 
  Req, 
  Logger, 
  BadRequestException, 
  InternalServerErrorException, 
  UnauthorizedException, 
  HttpException 
} from '@nestjs/common';
import { AuthService } from './auth.services';
import { Public } from './decorators/public.decorator';
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly logger = new Logger(AuthController.name);

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Req() req) {
    this.logger.log(`Login attempt for: ${body.email} from IP: ${req.ip}`);
    
    if (!body.email || !body.password) {
      this.logger.warn('Missing email or password in login request');
      throw new BadRequestException('Email and password are required');
    }

    try {
      const result = await this.authService.login(body.email, body.password, req.ip);
      
      if (!result || !result.access_token) {
        this.logger.error('Login failed: No access token in response');
        throw new InternalServerErrorException('Authentication failed');
      }

      this.logger.log(`Successful login for user: ${body.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Login error for ${body.email}: ${error.message}`, error.stack);
      
      // Don't expose internal errors to the client
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }
}