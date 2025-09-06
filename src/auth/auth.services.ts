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
    try {
      // 1. Find user by email with minimal data
      const user = await this.userService.findByEmail(email);

      console.log('the user: ',user);
      
      // 2. Check if user exists and password is correct
      if (!user || !(await bcrypt.compare(password, user.password))) {
        if (this.auditLogService) {
          await this.auditLogService.log(null, 'login_failed', { email }, ip);
        }
        throw new UnauthorizedException('Invalid credentials');
      }


      // 3. Get user's roles and tenant from user.userRoles
      const userRoles = user.userRoles || [];
      let tenantId: string | null = null;
      if (userRoles.length > 0 && 'tenantId' in userRoles[0]) {
        tenantId = (userRoles[0] as any).tenantId;
      }
      if (!tenantId) {
        throw new UnauthorizedException('No tenant assigned to this user. Please contact support.');
      }
      // 4. Get user's permissions
      const userPermissions: string[] = [];
      try {
        const perms = await this.userService.getEffectivePermissions(user.id, tenantId);
        perms.forEach(perm => {
          if (perm.name) userPermissions.push(perm.name);
        });
      } catch (error) {
        console.error('Error fetching user permissions:', error);
      }

      // 5. Prepare JWT payload with all necessary user data
      const roles = userRoles.map(ur => ur.role?.name).filter(Boolean) || [];
      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name || '',
        tenantId: tenantId,
        branchId: user.branchId || null,
        roles: roles,
        permissions: userPermissions
      };

      console.log('JWT Payload:', JSON.stringify(payload, null, 2));

      // 6. Generate JWT token with all required claims and options
      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'waweru',
        issuer: 'saas-platform',
        audience: 'saas-platform-client',
      });

      console.log('[JWT_SECRET]', process.env.JWT_SECRET);
      console.log('Generated JWT Token:', accessToken);

      // 7. Log successful login
      if (this.auditLogService) {
        await this.auditLogService.log(
          user.id,
          'login_success',
          { email: user.email, tenantId: payload.tenantId, branchId: payload.branchId },
          ip
        );
      }

      // 8. Return token and user info
      return {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: payload.tenantId,
          branchId: payload.branchId,
          roles: payload.roles,
          permissions: payload.permissions
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
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