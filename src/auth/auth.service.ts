import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '../audit-log.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private auditLogService: AuditLogService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(email: string, password: string, ip?: string) {
    const user = await this.userService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      if (this.auditLogService) {
        await this.auditLogService.log(null, 'login_failed', { email }, ip);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const userRoles = await this.userService.getUserRoles(user.id);
    if (userRoles.length === 0) {
      throw new UnauthorizedException('User has no assigned roles or tenant.');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      roles: userRoles.map(ur => ur.role.name),
      tenantId: userRoles[0].tenantId, // Assuming user belongs to one tenant for now
    };

    if (this.auditLogService) {
      await this.auditLogService.log(user.id, 'login_success', { email: user.email }, ip);
    }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperadmin: user.isSuperadmin,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // Generate a secure token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Update user with reset token
    await this.userService.updateUserByEmail(email, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    });

    // TODO: Send email with reset link
    // For now, just log the token (in production, send email)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}`);

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      await this.userService.resetPassword(token, newPassword);
      return { message: 'Password has been reset successfully.' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}
