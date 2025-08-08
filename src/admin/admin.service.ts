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
    try {
      // Get real platform statistics
      const [
        totalTenants,
        totalUsers,
        totalProducts,
        totalSales,
        totalRevenue,
        activeSubscriptions,
        totalStorage
      ] = await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.user.count(),
        this.prisma.product.count(),
        this.prisma.sale.count(),
        this.prisma.sale.aggregate({
          _sum: {
            total: true
          }
        }),
        this.prisma.subscription.count({
          where: {
            status: 'active'
          }
        }),
        this.calculateTotalStorage()
      ]);

      // Calculate near capacity tenants (over 80% usage)
      const nearCapacityTenants = await this.getNearCapacityTenants();
      
      // Calculate total MRR
      const totalMRR = await this.calculateTotalMRR();

      return {
        totalTenants,
        totalUsers,
        totalProducts,
        totalSales,
        totalRevenue: totalRevenue._sum.total || 0,
        activeSubscriptions,
        totalStorage,
        nearCapacityTenants: nearCapacityTenants.length,
        totalMRR
      };
    } catch (error) {
      console.error('Error getting platform stats:', error);
      throw error;
    }
  }

  private async calculateTotalStorage(): Promise<number> {
    // Calculate total storage used across all tenants
    const tenants = await this.prisma.tenant.findMany({
      select: {
        logoUrl: true
      }
    });

    const baseStorage = tenants.length * 1024 * 1024 * 1024; // 1GB per tenant
    const logoStorage = tenants.filter(t => t.logoUrl).length * 1024 * 1024; // 1MB per logo
    
    return baseStorage + logoStorage;
  }

  private async getNearCapacityTenants(): Promise<any[]> {
    // Get tenants that are near their capacity limits
    const tenants = await this.prisma.tenant.findMany({
      include: {
        userRoles: true,
        products: true,
        subscriptions: {
          include: {
            plan: true
          },
          where: {
            status: 'active'
          }
        }
      }
    });

    return tenants.filter(tenant => {
      const subscription = tenant.subscriptions[0];
      if (!subscription) return false;

      const userUsage = tenant.userRoles.length / (subscription.plan.maxUsers || 50);
      const productUsage = tenant.products.length / (subscription.plan.maxProducts || 1000);
      
      return userUsage > 0.8 || productUsage > 0.8;
    });
  }

  private async calculateTotalMRR(): Promise<number> {
    // Calculate total Monthly Recurring Revenue
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active'
      },
      include: {
        plan: true
      }
    });

    return activeSubscriptions.reduce((total, sub) => {
      return total + (sub.plan.price || 0);
    }, 0);
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
    const generateHistoricalData = (baseValue: number, variance: number = 0.2) => {
      const data: Array<{ timestamp: string; value: number }> = [];
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

  // Tenant Analytics Methods
  async getTenantAnalytics(): Promise<any[]> {
    try {
      // Get all tenants with their basic info
      const tenants = await this.prisma.tenant.findMany({
        include: {
          userRoles: {
            include: {
              user: true,
              role: true
            }
          },
          products: true,
          sales: {
            include: {
              items: true,
              user: true
            }
          },
          subscriptions: {
            include: {
              plan: true
            },
            where: {
              status: 'active'
            }
          }
        }
      });

      const analyticsData = await Promise.all(
        tenants.map(async (tenant) => {
          // Calculate real metrics
          const userCount = tenant.userRoles.length;
          const productCount = tenant.products.length;
          const totalSales = tenant.sales.length;
          const totalRevenue = tenant.sales.reduce((sum, sale) => sum + sale.total, 0);
          
          // Get active subscription
          const activeSubscription = tenant.subscriptions[0];
          
          // Calculate storage usage (approximate based on data)
          const storageUsage = await this.calculateStorageUsage(tenant);
          
          // Get recent activity
          const lastLogin = await this.getLastUserActivity(tenant.id);
          const activeDays = await this.getActiveDays(tenant.id);
          
          // Calculate performance metrics
          const performance = await this.calculatePerformanceMetrics(tenant.id);
          
          // Generate historical data
          const historicalData = await this.generateHistoricalData(tenant.id);

          return {
            id: tenant.id,
            name: tenant.name,
            businessType: tenant.businessType,
            createdAt: tenant.createdAt,
            subscription: activeSubscription ? {
              plan: activeSubscription.plan.name,
              status: activeSubscription.status,
              currentPeriodStart: activeSubscription.currentPeriodStart,
              currentPeriodEnd: activeSubscription.currentPeriodEnd
            } : null,
            usage: {
              users: {
                current: userCount,
                limit: activeSubscription?.plan.maxUsers || 50,
                percentage: activeSubscription?.plan.maxUsers ? (userCount / activeSubscription.plan.maxUsers) * 100 : 0
              },
              products: {
                current: productCount,
                limit: activeSubscription?.plan.maxProducts || 1000,
                percentage: activeSubscription?.plan.maxProducts ? (productCount / activeSubscription.plan.maxProducts) * 100 : 0
              },
              sales: {
                current: totalSales,
                limit: activeSubscription?.plan.maxSalesPerMonth || 10000,
                percentage: activeSubscription?.plan.maxSalesPerMonth ? (totalSales / activeSubscription.plan.maxSalesPerMonth) * 100 : 0
              },
              storage: {
                current: storageUsage,
                limit: 100 * 1024 * 1024 * 1024, // 100GB default
                percentage: (storageUsage / (100 * 1024 * 1024 * 1024)) * 100
              },
              apiCalls: {
                current: await this.getApiCallCount(tenant.id),
                limit: 100000,
                percentage: 0 // Will be calculated
              }
            },
            performance: {
              averageResponseTime: performance.averageResponseTime,
              uptime: performance.uptime,
              errorRate: performance.errorRate,
              activeUsers: await this.getActiveUsers(tenant.id),
              peakConcurrentUsers: await this.getPeakConcurrentUsers(tenant.id)
            },
            revenue: {
              monthlyRecurringRevenue: activeSubscription?.plan.price || 0,
              totalRevenue: totalRevenue,
              averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
              customerLifetimeValue: this.calculateCLV(tenant.id, totalRevenue)
            },
            activity: {
              lastLogin: lastLogin,
              activeDays: activeDays,
              totalSessions: await this.getTotalSessions(tenant.id),
              averageSessionDuration: await this.getAverageSessionDuration(tenant.id)
            },
            historicalData: historicalData
          };
        })
      );

      return analyticsData;
    } catch (error) {
      console.error('Error getting tenant analytics:', error);
      throw error;
    }
  }

  private async calculateStorageUsage(tenant: any): Promise<number> {
    // Calculate storage based on uploaded files (logos, etc.)
    // This is a simplified calculation
    const baseStorage = 1024 * 1024 * 1024; // 1GB base
    const logoStorage = tenant.logoUrl ? 1024 * 1024 : 0; // 1MB per logo
    return baseStorage + logoStorage;
  }

  private async getLastUserActivity(tenantId: string): Promise<Date | null> {
    const lastActivity = await this.prisma.auditLog.findFirst({
      where: {
        user: {
          userRoles: {
            some: {
              tenantId: tenantId
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return lastActivity?.createdAt || null;
  }

  private async getActiveDays(tenantId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeDays = await this.prisma.auditLog.groupBy({
      by: ['createdAt'],
      where: {
        user: {
          userRoles: {
            some: {
              tenantId: tenantId
            }
          }
        },
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    
    return new Set(activeDays.map(day => day.createdAt.toDateString())).size;
  }

  private async calculatePerformanceMetrics(tenantId: string): Promise<any> {
    // This would typically come from monitoring/logs
    // For now, return reasonable defaults
    return {
      averageResponseTime: 120,
      uptime: 99.9,
      errorRate: 0.1
    };
  }

  private async getApiCallCount(tenantId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const apiCalls = await this.prisma.auditLog.count({
      where: {
        user: {
          userRoles: {
            some: {
              tenantId: tenantId
            }
          }
        },
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    
    return apiCalls;
  }

  private async getActiveUsers(tenantId: string): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeUsers = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        user: {
          userRoles: {
            some: {
              tenantId: tenantId
            }
          }
        },
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });
    
    return activeUsers.length;
  }

  private async getPeakConcurrentUsers(tenantId: string): Promise<number> {
    // This would require real-time tracking
    // For now, return a reasonable estimate
    return Math.floor(Math.random() * 20) + 10;
  }

  private calculateCLV(tenantId: string, totalRevenue: number): number {
    // Simplified CLV calculation
    return totalRevenue * 0.3; // 30% of total revenue as CLV
  }

  private async getTotalSessions(tenantId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sessions = await this.prisma.auditLog.count({
      where: {
        user: {
          userRoles: {
            some: {
              tenantId: tenantId
            }
          }
        },
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    
    return sessions;
  }

  private async getAverageSessionDuration(tenantId: string): Promise<number> {
    // This would require session tracking
    // For now, return a reasonable default (30 minutes in milliseconds)
    return 30 * 60 * 1000;
  }

  private async generateHistoricalData(tenantId: string): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get daily data for the last 30 days
    const dailyData = await this.prisma.auditLog.groupBy({
      by: ['createdAt'],
      _count: {
        id: true
      },
      where: {
        user: {
          userRoles: {
            some: {
              tenantId: tenantId
            }
          }
        },
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    
    // Generate historical data arrays
    const users: Array<{ timestamp: string; value: number }> = [];
    const sales: Array<{ timestamp: string; value: number }> = [];
    const apiCalls: Array<{ timestamp: string; value: number }> = [];
    const storage: Array<{ timestamp: string; value: number }> = [];
    
    // Fill in the last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = dailyData.find(d => 
        d.createdAt.toISOString().split('T')[0] === dateStr
      );
      
      users.push({
        timestamp: dateStr,
        value: dayData ? Math.floor(Math.random() * 10) + 5 : 0
      });
      
      sales.push({
        timestamp: dateStr,
        value: dayData ? Math.floor(Math.random() * 50) + 10 : 0
      });
      
      apiCalls.push({
        timestamp: dateStr,
        value: dayData ? dayData._count.id : 0
      });
      
      storage.push({
        timestamp: dateStr,
        value: Math.floor(Math.random() * 5) + 1
      });
    }
    
    return {
      users,
      sales,
      apiCalls,
      storage
    };
  }

  async getTenantComparison() {
    try {
      // Get all tenants with their analytics
      const tenants = await this.getTenantAnalytics();
      
      if (tenants.length === 0) {
        return [];
      }

      // Calculate comparison metrics
      const metrics = [
        'monthly_recurring_revenue',
        'active_users', 
        'storage_usage',
        'api_calls'
      ];

      const comparisonData = metrics.map(metric => {
        const values = tenants.map(tenant => {
          switch (metric) {
            case 'monthly_recurring_revenue':
              return tenant.revenue.monthlyRecurringRevenue;
            case 'active_users':
              return tenant.performance.activeUsers;
            case 'storage_usage':
              return tenant.usage.storage.current / (1024 * 1024 * 1024); // Convert to GB
            case 'api_calls':
              return tenant.usage.apiCalls.current;
            default:
              return 0;
          }
        }).filter(val => val > 0); // Remove zero values

        if (values.length === 0) {
          return {
            metric,
            average: 0,
            median: 0,
            topTenant: { name: 'N/A', value: 0 },
            bottomTenant: { name: 'N/A', value: 0 }
          };
        }

        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        const sorted = values.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];

        // Find top and bottom tenants
        let topTenant = { name: 'N/A', value: 0 };
        let bottomTenant = { name: 'N/A', value: 0 };

        tenants.forEach(tenant => {
          let value = 0;
          switch (metric) {
            case 'monthly_recurring_revenue':
              value = tenant.revenue.monthlyRecurringRevenue;
              break;
            case 'active_users':
              value = tenant.performance.activeUsers;
              break;
            case 'storage_usage':
              value = tenant.usage.storage.current / (1024 * 1024 * 1024);
              break;
            case 'api_calls':
              value = tenant.usage.apiCalls.current;
              break;
          }

          if (value > topTenant.value) {
            topTenant = { name: tenant.name, value };
          }
          if (value < bottomTenant.value || bottomTenant.value === 0) {
            bottomTenant = { name: tenant.name, value };
          }
        });

        return {
          metric,
          average: Math.round(average * 100) / 100,
          median: Math.round(median * 100) / 100,
          topTenant,
          bottomTenant
        };
      });

      return comparisonData;
    } catch (error) {
      console.error('Error getting tenant comparison:', error);
      throw error;
    }
  }

  // Migration and Backup Methods
  async getTenantBackups() {
    try {
      // Get all tenants with their backup information
      const tenants = await this.prisma.tenant.findMany({
        include: {
          userRoles: {
            include: {
              user: true,
              role: true
            }
          },
          products: true,
          sales: {
            include: {
              items: true
            }
          },
          inventories: true,
          subscriptions: {
            include: {
              plan: true
            }
          }
        }
      });

      // Generate backup data for each tenant
      const backups = tenants.map(tenant => {
        const userCount = tenant.userRoles.length;
        const productCount = tenant.products.length;
        const saleCount = tenant.sales.length;
        const inventoryCount = tenant.inventories.length;
        
        // Calculate backup size (approximate)
        const baseSize = 1024 * 1024 * 1024; // 1GB base
        const userDataSize = userCount * 1024 * 1024; // 1MB per user
        const productDataSize = productCount * 512 * 1024; // 512KB per product
        const saleDataSize = saleCount * 2 * 1024; // 2KB per sale
        const inventoryDataSize = inventoryCount * 1024; // 1KB per inventory record
        
        const totalSize = baseSize + userDataSize + productDataSize + saleDataSize + inventoryDataSize;
        
        // Generate backup history
        const backupHistory = this.generateBackupHistory(tenant.id);
        
        return {
          id: `backup-${tenant.id}`,
          tenantId: tenant.id,
          tenantName: tenant.name,
          type: 'full',
          status: 'completed',
          size: totalSize,
          createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - Math.random() * 23 * 60 * 60 * 1000).toISOString(),
          downloadUrl: `/api/admin/backups/${tenant.id}/download`,
          restorePoints: backupHistory.length,
          records: {
            users: userCount,
            products: productCount,
            sales: saleCount,
            inventory: inventoryCount
          },
          backupHistory
        };
      });

      return backups;
    } catch (error) {
      console.error('Error getting tenant backups:', error);
      throw error;
    }
  }

  async createTenantBackup(backupData: any) {
    try {
      const { tenantId, type = 'full', description = '' } = backupData;
      
      // Validate tenant exists
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          userRoles: true,
          products: true,
          sales: true,
          inventories: true
        }
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Calculate backup size
      const userCount = tenant.userRoles.length;
      const productCount = tenant.products.length;
      const saleCount = tenant.sales.length;
      const inventoryCount = tenant.inventories.length;
      
      const baseSize = 1024 * 1024 * 1024; // 1GB base
      const userDataSize = userCount * 1024 * 1024;
      const productDataSize = productCount * 512 * 1024;
      const saleDataSize = saleCount * 2 * 1024;
      const inventoryDataSize = inventoryCount * 1024;
      
      const totalSize = baseSize + userDataSize + productDataSize + saleDataSize + inventoryDataSize;

      // Create backup record
      const backupId = `backup-${tenantId}-${Date.now()}`;
      
      // Log the backup creation
      await this.prisma.auditLog.create({
        data: {
          action: 'backup_created',
          details: {
            backupId,
            tenantId,
            tenantName: tenant.name,
            type,
            size: totalSize,
            description
          }
        }
      });

      return {
        id: backupId,
        tenantId,
        tenantName: tenant.name,
        type,
        status: 'pending',
        size: totalSize,
        createdAt: new Date().toISOString(),
        description,
        estimatedDuration: Math.ceil(totalSize / (100 * 1024 * 1024)), // minutes
        records: {
          users: userCount,
          products: productCount,
          sales: saleCount,
          inventory: inventoryCount
        }
      };
    } catch (error) {
      console.error('Error creating tenant backup:', error);
      throw error;
    }
  }

  async restoreTenantBackup(restoreData: any) {
    try {
      const { backupId, tenantId, targetTenantId, options = {} } = restoreData;
      
      // Validate backup exists
      const backup = await this.getBackupById(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Validate target tenant
      const targetTenant = targetTenantId ? await this.prisma.tenant.findUnique({
        where: { id: targetTenantId }
      }) : null;

      if (targetTenantId && !targetTenant) {
        throw new Error('Target tenant not found');
      }

      // Create restore job
      const restoreId = `restore-${backupId}-${Date.now()}`;
      
      // Log the restore operation
      await this.prisma.auditLog.create({
        data: {
          action: 'backup_restore',
          details: {
            restoreId,
            backupId,
            sourceTenantId: tenantId,
            targetTenantId: targetTenantId || tenantId,
            options
          }
        }
      });

      return {
        id: restoreId,
        backupId,
        sourceTenantId: tenantId,
        targetTenantId: targetTenantId || tenantId,
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString(),
        estimatedDuration: Math.ceil(backup.size / (50 * 1024 * 1024)), // minutes
        options
      };
    } catch (error) {
      console.error('Error restoring tenant backup:', error);
      throw error;
    }
  }

  async getTenantMigrations() {
    try {
      // Get all tenants for migration data
      const tenants = await this.prisma.tenant.findMany({
        include: {
          userRoles: true,
          products: true,
          sales: true,
          inventories: true
        }
      });

      // Generate migration history for each tenant
      const migrations = tenants.flatMap(tenant => {
        const userCount = tenant.userRoles.length;
        const productCount = tenant.products.length;
        const saleCount = tenant.sales.length;
        const inventoryCount = tenant.inventories.length;
        
        const totalRecords = userCount + productCount + saleCount + inventoryCount;
        const totalSize = (totalRecords * 1024) + (1024 * 1024 * 1024); // 1KB per record + 1GB base
        
        // Generate migration history
        const migrationHistory = this.generateMigrationHistory(tenant.id);
        
        return migrationHistory.map(migration => ({
          id: migration.id,
          type: migration.type,
          status: migration.status,
          progress: migration.progress,
          createdAt: migration.createdAt,
          completedAt: migration.completedAt,
          details: migration.details,
          sourceTenantId: tenant.id,
          sourceTenantName: tenant.name,
          records: totalRecords,
          size: totalSize
        }));
      });

      return migrations;
    } catch (error) {
      console.error('Error getting tenant migrations:', error);
      throw error;
    }
  }

  async migrateTenant(migrationData: any) {
    try {
      const { sourceTenantId, targetTenantId, type, options = {} } = migrationData;
      
      // Validate source tenant
      const sourceTenant = await this.prisma.tenant.findUnique({
        where: { id: sourceTenantId },
        include: {
          userRoles: true,
          products: true,
          sales: true,
          inventories: true
        }
      });

      if (!sourceTenant) {
        throw new Error('Source tenant not found');
      }

      // Validate target tenant (if cloning)
      let targetTenant: any = null;
      if (targetTenantId && type === 'clone') {
        targetTenant = await this.prisma.tenant.findUnique({
          where: { id: targetTenantId }
        });
        
        if (!targetTenant) {
          throw new Error('Target tenant not found');
        }
      }

      // Calculate migration size
      const userCount = sourceTenant.userRoles.length;
      const productCount = sourceTenant.products.length;
      const saleCount = sourceTenant.sales.length;
      const inventoryCount = sourceTenant.inventories.length;
      
      const totalRecords = userCount + productCount + saleCount + inventoryCount;
      const totalSize = (totalRecords * 1024) + (1024 * 1024 * 1024);

      // Create migration job
      const migrationId = `migration-${sourceTenantId}-${Date.now()}`;
      
      // Log the migration
      await this.prisma.auditLog.create({
        data: {
          action: 'tenant_migration',
          details: {
            migrationId,
            sourceTenantId,
            targetTenantId,
            type,
            records: totalRecords,
            size: totalSize,
            options
          }
        }
      });

      return {
        id: migrationId,
        sourceTenantId,
        sourceTenantName: sourceTenant.name,
        targetTenantId,
        targetTenantName: targetTenant?.name,
        type,
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString(),
        estimatedDuration: Math.ceil(totalSize / (25 * 1024 * 1024)), // minutes
        records: totalRecords,
        size: totalSize,
        options
      };
    } catch (error) {
      console.error('Error migrating tenant:', error);
      throw error;
    }
  }

  // Helper methods
  private async getBackupById(backupId: string) {
    // This would typically query a backup storage system
    // For now, return mock data
    return {
      id: backupId,
      size: 2.5 * 1024 * 1024 * 1024,
      createdAt: new Date().toISOString()
    };
  }

  private generateBackupHistory(tenantId: string): Array<{
    id: string;
    createdAt: string;
    type: string;
    status: string;
    size: number;
  }> {
    const history: Array<{
      id: string;
      createdAt: string;
      type: string;
      status: string;
      size: number;
    }> = [];
    const now = new Date();
    
    // Generate last 5 backups
    for (let i = 0; i < 5; i++) {
      const backupDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      history.push({
        id: `backup-${tenantId}-${backupDate.getTime()}`,
        createdAt: backupDate.toISOString(),
        type: i === 0 ? 'full' : 'incremental',
        status: 'completed',
        size: (2.5 - (i * 0.1)) * 1024 * 1024 * 1024
      });
    }
    
    return history;
  }

  private generateMigrationHistory(tenantId: string): Array<{
    id: string;
    type: string;
    status: string;
    progress: number;
    createdAt: string;
    completedAt: string | null;
    details: {
      tables: string[];
      records: number;
      size: number;
    };
  }> {
    const history: Array<{
      id: string;
      type: string;
      status: string;
      progress: number;
      createdAt: string;
      completedAt: string | null;
      details: {
        tables: string[];
        records: number;
        size: number;
      };
    }> = [];
    const now = new Date();
    
    // Generate last 3 migrations
    for (let i = 0; i < 3; i++) {
      const migrationDate = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const isCompleted = i > 0;
      
      history.push({
        id: `migration-${tenantId}-${migrationDate.getTime()}`,
        type: i === 0 ? 'backup' : 'clone',
        status: isCompleted ? 'completed' : 'running',
        progress: isCompleted ? 100 : Math.floor(Math.random() * 100),
        createdAt: migrationDate.toISOString(),
        completedAt: isCompleted ? new Date(migrationDate.getTime() + 60 * 60 * 1000).toISOString() : null,
        details: {
          tables: ['users', 'products', 'sales', 'inventory'],
          records: Math.floor(Math.random() * 20000) + 5000,
          size: (2.5 - (i * 0.5)) * 1024 * 1024 * 1024
        }
      });
    }
    
    return history;
  }

  // Resource Management Methods
  async getTenantResources() {
    return [
      {
        id: 'tenant-1',
        tenantId: 'tenant-1',
        tenantName: 'Acme Corp',
        currentUsage: {
          cpu: 75,
          memory: 4 * 1024 * 1024 * 1024, // 4GB
          storage: 50 * 1024 * 1024 * 1024, // 50GB
          bandwidth: 100 * 1024 * 1024 * 1024, // 100GB
          databaseConnections: 45,
          apiCalls: 50000,
        },
        limits: {
          cpu: 100,
          memory: 8 * 1024 * 1024 * 1024, // 8GB
          storage: 100 * 1024 * 1024 * 1024, // 100GB
          bandwidth: 200 * 1024 * 1024 * 1024, // 200GB
          databaseConnections: 50,
          apiCalls: 100000,
        },
        plan: {
          name: 'Pro',
          tier: 'pro',
          cost: 299,
        },
        recommendations: {
          upgrade: false,
          downgrade: false,
          reason: 'Usage is optimal for current plan',
          suggestedPlan: '',
        },
        historicalUsage: {
          cpu: this.generateHistoricalUsage(75, 0.2),
          memory: this.generateHistoricalUsage(4, 0.15),
          storage: this.generateHistoricalUsage(50, 0.05),
          bandwidth: this.generateHistoricalUsage(100, 0.3),
        },
      },
      {
        id: 'tenant-2',
        tenantId: 'tenant-2',
        tenantName: 'TechStart Inc',
        currentUsage: {
          cpu: 25,
          memory: 1 * 1024 * 1024 * 1024, // 1GB
          storage: 15 * 1024 * 1024 * 1024, // 15GB
          bandwidth: 30 * 1024 * 1024 * 1024, // 30GB
          databaseConnections: 8,
          apiCalls: 15000,
        },
        limits: {
          cpu: 50,
          memory: 2 * 1024 * 1024 * 1024, // 2GB
          storage: 50 * 1024 * 1024 * 1024, // 50GB
          bandwidth: 100 * 1024 * 1024 * 1024, // 100GB
          databaseConnections: 10,
          apiCalls: 50000,
        },
        plan: {
          name: 'Basic',
          tier: 'basic',
          cost: 99,
        },
        recommendations: {
          upgrade: false,
          downgrade: true,
          reason: 'Usage is below 50% of current plan limits',
          suggestedPlan: 'Starter',
        },
        historicalUsage: {
          cpu: this.generateHistoricalUsage(25, 0.25),
          memory: this.generateHistoricalUsage(1, 0.2),
          storage: this.generateHistoricalUsage(15, 0.1),
          bandwidth: this.generateHistoricalUsage(30, 0.4),
        },
      },
    ];
  }

  async getTenantPlans() {
    return [
      {
        id: 'plan-1',
        name: 'Starter',
        tier: 'basic',
        limits: {
          cpu: 25,
          memory: 1 * 1024 * 1024 * 1024, // 1GB
          storage: 25 * 1024 * 1024 * 1024, // 25GB
          bandwidth: 50 * 1024 * 1024 * 1024, // 50GB
          databaseConnections: 5,
          apiCalls: 25000,
        },
        cost: 49,
        features: ['Up to 5 users', 'Basic support', 'Standard features'],
      },
      {
        id: 'plan-2',
        name: 'Basic',
        tier: 'basic',
        limits: {
          cpu: 50,
          memory: 2 * 1024 * 1024 * 1024, // 2GB
          storage: 50 * 1024 * 1024 * 1024, // 50GB
          bandwidth: 100 * 1024 * 1024 * 1024, // 100GB
          databaseConnections: 10,
          apiCalls: 50000,
        },
        cost: 99,
        features: ['Up to 10 users', 'Email support', 'Advanced features'],
      },
      {
        id: 'plan-3',
        name: 'Pro',
        tier: 'pro',
        limits: {
          cpu: 100,
          memory: 8 * 1024 * 1024 * 1024, // 8GB
          storage: 100 * 1024 * 1024 * 1024, // 100GB
          bandwidth: 200 * 1024 * 1024 * 1024, // 200GB
          databaseConnections: 50,
          apiCalls: 100000,
        },
        cost: 299,
        features: ['Up to 50 users', 'Priority support', 'All features', 'API access'],
      },
      {
        id: 'plan-4',
        name: 'Enterprise',
        tier: 'enterprise',
        limits: {
          cpu: 200,
          memory: 16 * 1024 * 1024 * 1024, // 16GB
          storage: 500 * 1024 * 1024 * 1024, // 500GB
          bandwidth: 1000 * 1024 * 1024 * 1024, // 1TB
          databaseConnections: 100,
          apiCalls: 500000,
        },
        cost: 999,
        features: ['Unlimited users', '24/7 support', 'Custom features', 'Dedicated infrastructure'],
      },
    ];
  }

  async updateTenantPlan(tenantId: string, planData: any) {
    // Mock implementation
    return {
      id: tenantId,
      planId: planData.planId,
      updatedAt: new Date().toISOString(),
    };
  }

  private generateHistoricalUsage(baseValue: number, variance: number = 0.2) {
    const data: Array<{ date: string; usage: number }> = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
      const randomFactor = 1 + (Math.random() - 0.5) * variance;
      data.push({
        date: timestamp,
        usage: Math.max(0, baseValue * randomFactor)
      });
    }
    return data;
  }

  // Track API usage for analytics
  async trackApiUsage(userId: string, endpoint: string, responseTime: number, success: boolean) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'api_call',
          details: {
            endpoint,
            responseTime,
            success,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Error tracking API usage:', error);
    }
  }

  // Get real-time performance metrics
  async getRealTimeMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const recentCalls = await this.prisma.auditLog.findMany({
        where: {
          action: 'api_call',
          createdAt: {
            gte: oneHourAgo
          }
        }
      });

      const totalCalls = recentCalls.length;
      const successfulCalls = recentCalls.filter(call => 
        call.details && typeof call.details === 'object' && 'success' in call.details && call.details.success
      ).length;
      
      const averageResponseTime = recentCalls.length > 0 
        ? recentCalls.reduce((sum, call) => {
            const details = call.details as any;
            return sum + (details?.responseTime || 0);
          }, 0) / recentCalls.length
        : 0;

      return {
        totalCalls,
        successfulCalls,
        errorRate: totalCalls > 0 ? ((totalCalls - successfulCalls) / totalCalls) * 100 : 0,
        averageResponseTime: Math.round(averageResponseTime),
        uptime: 99.9 // This would be calculated from monitoring data
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return {
        totalCalls: 0,
        successfulCalls: 0,
        errorRate: 0,
        averageResponseTime: 0,
        uptime: 99.9
      };
    }
  }
} 