import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getAllTenants() {
    return this.prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            userRoles: true,
            products: true,
            sales: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
              },
            },
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPlatformStats() {
    const [
      totalTenants,
      totalUsers,
      totalProducts,
      totalSales,
      activeTenants,
      superadminUsers,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.sale.count(),
      this.prisma.tenant.count({
        where: {
          userRoles: {
            some: {},
          },
        },
      }),
      this.prisma.user.count({
        where: {
          isSuperadmin: true,
        },
      }),
    ]);

    return {
      totalTenants,
      totalUsers,
      totalProducts,
      totalSales,
      activeTenants,
      superadminUsers,
      averageUsersPerTenant: totalTenants > 0 ? (totalUsers / totalTenants).toFixed(1) : 0,
      averageProductsPerTenant: totalTenants > 0 ? (totalProducts / totalTenants).toFixed(1) : 0,
    };
  }

  async getPlatformLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userRoles: {
              include: {
                tenant: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  async createTenant(tenantData: any) {
    const { name, businessType, contactEmail, contactPhone, address, currency, timezone, invoiceFooter, logoUrl, kraPin, vatNumber, etimsQrUrl } = tenantData;

    // Create tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        name,
        businessType,
        contactEmail,
        contactPhone,
        address,
        currency,
        timezone,
        invoiceFooter,
        logoUrl,
        kraPin,
        vatNumber,
        etimsQrUrl,
      },
    });

    // Create default admin user for the tenant
    const adminUser = await this.prisma.user.create({
      data: {
        email: contactEmail,
        password: '$2b$10$defaultpassword', // You should generate a proper password
        name: 'Admin User',
      },
    });

    // Get the admin role
    const adminRole = await this.prisma.role.findFirst({
      where: { name: 'admin' },
    });

    if (adminRole) {
      // Assign admin role to the user for this tenant
      await this.prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
          tenantId: tenant.id,
        },
      });
    }

    return tenant;
  }

  async deleteTenant(id: string) {
    // Delete all related data first
    await this.prisma.userRole.deleteMany({
      where: { tenantId: id },
    });

    await this.prisma.sale.deleteMany({
      where: { tenantId: id },
    });

    await this.prisma.product.deleteMany({
      where: { tenantId: id },
    });

    await this.prisma.inventory.deleteMany({
      where: { tenantId: id },
    });

    // Delete the tenant
    return this.prisma.tenant.delete({
      where: { id },
    });
  }

  async getTenantById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userRoles: true,
            products: true,
            sales: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            role: true,
          },
        },
      },
    });
  }

  async getSystemHealth() {
    // Simulate system health data
    const database = {
      status: 'healthy' as const,
      responseTime: Math.floor(Math.random() * 50) + 10,
      connections: Math.floor(Math.random() * 20) + 5,
      maxConnections: 100,
    };

    const api = {
      status: 'healthy' as const,
      responseTime: Math.floor(Math.random() * 200) + 50,
      requestsPerMinute: Math.floor(Math.random() * 1000) + 500,
      errorRate: Math.random() * 2,
    };

    const storage = {
      status: 'healthy' as const,
      usedSpace: 50 * 1024 * 1024 * 1024, // 50GB
      totalSpace: 100 * 1024 * 1024 * 1024, // 100GB
      usagePercentage: 50,
    };

    const memory = {
      status: 'healthy' as const,
      usedMemory: 4 * 1024 * 1024 * 1024, // 4GB
      totalMemory: 8 * 1024 * 1024 * 1024, // 8GB
      usagePercentage: 50,
    };

    const activeIssues = [];
    const recentAlerts = [
      {
        id: '1',
        type: 'Performance',
        message: 'API response time increased by 20%',
        severity: 'warning' as const,
        timestamp: new Date().toISOString(),
      },
    ];

    return {
      database,
      api,
      storage,
      memory,
      activeIssues,
      recentAlerts,
    };
  }

  async getPerformanceMetrics() {
    // Generate historical data for the last 24 hours (24 data points)
    const generateHistoricalData = (baseValue: number, variance: number = 0.2) => {
      const data = [];
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
        const randomFactor = 1 + (Math.random() - 0.5) * variance;
        data.push({
          timestamp,
          value: Math.max(0, Math.round(baseValue * randomFactor))
        });
      }
      return data;
    };

    const baseResponseTime = Math.floor(Math.random() * 200) + 50;
    const baseRequests = Math.floor(Math.random() * 10000) + 5000;
    const baseErrorRate = Math.random() * 2;
    const baseUsers = Math.floor(Math.random() * 100) + 20;

    return {
      averageResponseTime: baseResponseTime,
      totalRequests: baseRequests,
      errorRate: baseErrorRate,
      activeUsers: baseUsers,
      peakConcurrentUsers: Math.floor(Math.random() * 200) + 50,
      historicalData: {
        responseTimes: generateHistoricalData(baseResponseTime, 0.3),
        requests: generateHistoricalData(baseRequests, 0.4),
        errors: generateHistoricalData(baseErrorRate * 100, 0.5),
        users: generateHistoricalData(baseUsers, 0.2),
      },
    };
  }

  async getSupportTickets(status?: string, priority?: string) {
    // For now, return mock data. In a real implementation, you'd query the database
    const mockTickets = [
      {
        id: '1',
        tenantId: 'tenant-1',
        tenantName: 'Acme Corp',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@acme.com',
        subject: 'Cannot access inventory module',
        description: 'I am unable to access the inventory module. When I click on it, I get a 404 error. This started happening yesterday.',
        priority: 'high' as const,
        status: 'open' as const,
        category: 'technical' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        tenantId: 'tenant-2',
        tenantName: 'TechStart Inc',
        userId: 'user-2',
        userName: 'Jane Smith',
        userEmail: 'jane@techstart.com',
        subject: 'Billing question',
        description: 'I noticed an unexpected charge on my bill. Can you help me understand what this is for?',
        priority: 'medium' as const,
        status: 'in_progress' as const,
        category: 'billing' as const,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    let filteredTickets = mockTickets;

    if (status && status !== 'all') {
      filteredTickets = filteredTickets.filter(ticket => ticket.status === status);
    }

    if (priority && priority !== 'all') {
      filteredTickets = filteredTickets.filter(ticket => ticket.priority === priority);
    }

    return filteredTickets;
  }

  async getSupportTicket(id: string) {
    // Mock implementation
    return {
      id,
      tenantId: 'tenant-1',
      tenantName: 'Acme Corp',
      userId: 'user-1',
      userName: 'John Doe',
      userEmail: 'john@acme.com',
      subject: 'Cannot access inventory module',
      description: 'I am unable to access the inventory module. When I click on it, I get a 404 error. This started happening yesterday.',
      priority: 'high' as const,
      status: 'open' as const,
      category: 'technical' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getTicketResponses(ticketId: string) {
    // Mock implementation
    return [
      {
        id: '1',
        ticketId,
        userId: 'user-1',
        userName: 'John Doe',
        message: 'I am unable to access the inventory module. When I click on it, I get a 404 error.',
        isInternal: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        ticketId,
        userId: 'superadmin-1',
        userName: 'Platform Support',
        message: 'Thank you for reporting this issue. We are investigating the problem and will get back to you shortly.',
        isInternal: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        ticketId,
        userId: 'superadmin-1',
        userName: 'Platform Support',
        message: 'Internal note: This appears to be a routing issue. Need to check the tenant configuration.',
        isInternal: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async addTicketResponse(ticketId: string, responseData: any, user: any) {
    // Mock implementation
    return {
      id: Math.random().toString(),
      ticketId,
      userId: user.id,
      userName: user.name || 'Platform Support',
      message: responseData.message,
      isInternal: responseData.isInternal || false,
      createdAt: new Date().toISOString(),
    };
  }

  async updateTicket(ticketId: string, updateData: any) {
    // Mock implementation
    return {
      id: ticketId,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
  }

  async getBulkOperations() {
    // Mock implementation
    return [
      {
        id: '1',
        type: 'user_management',
        action: 'suspend_users',
        description: 'Suspended 15 users across 3 tenants',
        affectedCount: 15,
        status: 'completed' as const,
        progress: 100,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'tenant_management',
        action: 'update_plan',
        description: 'Updating subscription plans for 5 tenants',
        affectedCount: 5,
        status: 'running' as const,
        progress: 60,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
  }

  async executeBulkAction(actionData: any, user: any) {
    // Mock implementation
    const operation: any = {
      id: Math.random().toString(),
      type: actionData.type || 'system_maintenance',
      action: actionData.action,
      description: `Executing ${actionData.action}...`,
      affectedCount: 0,
      status: 'running' as const,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    // Simulate async operation
    setTimeout(() => {
      operation.status = 'completed';
      operation.progress = 100;
      operation.completedAt = new Date().toISOString();
    }, 5000);

    return operation;
  }
} 