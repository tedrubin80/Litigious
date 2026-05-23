const prisma = require('./prisma');

class DatabaseHealthChecker {
  constructor() {
    this.prisma = prisma;
  }

  async checkConnectionHealth() {
    const start = Date.now();
    try {
      await this.prisma.$executeRaw`SELECT 1`;
      const duration = Date.now() - start;
      return {
        status: 'healthy',
        connectionTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkIndexPerformance() {
    const queries = [
      {
        name: 'User lookup by email',
        query: () => this.prisma.user.findUnique({ where: { email: 'admin@legalestate.com' } })
      },
      {
        name: 'Active cases query',
        query: () => this.prisma.case.findMany({ 
          where: { status: { in: ['ACTIVE', 'SETTLEMENT_NEGOTIATION'] } },
          take: 10
        })
      },
      {
        name: 'Cases by attorney',
        query: () => this.prisma.case.findMany({
          where: { attorneyId: { not: null } },
          include: { attorney: true },
          take: 10
        })
      },
      {
        name: 'Recent invoices',
        query: () => this.prisma.invoice.findMany({
          where: { 
            createdAt: { 
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      }
    ];

    const results = [];
    for (const { name, query } of queries) {
      const start = Date.now();
      try {
        await query();
        const duration = Date.now() - start;
        results.push({
          query: name,
          status: 'success',
          duration: `${duration}ms`,
          performance: duration < 100 ? 'excellent' : duration < 500 ? 'good' : 'needs_optimization'
        });
      } catch (error) {
        results.push({
          query: name,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  async checkDataIntegrity() {
    const checks = [];

    try {
      // Check for orphaned cases (cases without clients)
      const orphanedCases = await this.prisma.case.count({
        where: { client: null }
      });
      
      checks.push({
        check: 'Orphaned cases',
        status: orphanedCases === 0 ? 'pass' : 'warning',
        count: orphanedCases,
        message: orphanedCases > 0 ? `${orphanedCases} cases found without clients` : 'No orphaned cases'
      });

      // Check for settlements without cases
      const orphanedSettlements = await this.prisma.settlement.count({
        where: { case: null }
      });
      
      checks.push({
        check: 'Orphaned settlements',
        status: orphanedSettlements === 0 ? 'pass' : 'warning',
        count: orphanedSettlements,
        message: orphanedSettlements > 0 ? `${orphanedSettlements} settlements found without cases` : 'No orphaned settlements'
      });

      // Check for invalid email formats
      const invalidEmails = await this.prisma.user.count({
        where: {
          email: {
            not: {
              contains: '@'
            }
          }
        }
      });
      
      checks.push({
        check: 'Invalid user emails',
        status: invalidEmails === 0 ? 'pass' : 'fail',
        count: invalidEmails,
        message: invalidEmails > 0 ? `${invalidEmails} users with invalid email formats` : 'All user emails are valid'
      });

      // Check for negative settlement amounts
      const negativeSettlements = await this.prisma.settlement.count({
        where: { amount: { lt: 0 } }
      });
      
      checks.push({
        check: 'Negative settlement amounts',
        status: negativeSettlements === 0 ? 'pass' : 'fail',
        count: negativeSettlements,
        message: negativeSettlements > 0 ? `${negativeSettlements} settlements with negative amounts` : 'All settlement amounts are valid'
      });

    } catch (error) {
      checks.push({
        check: 'Data integrity check',
        status: 'error',
        error: error.message
      });
    }

    return checks;
  }

  async getTableSizes() {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname;
      `;

      return result;
    } catch (error) {
      return {
        error: 'Could not retrieve table statistics',
        message: error.message
      };
    }
  }

  async getConnectionInfo() {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          count(*) as active_connections,
          max(state) as max_state
        FROM pg_stat_activity 
        WHERE datname = current_database();
      `;

      return result[0];
    } catch (error) {
      return {
        error: 'Could not retrieve connection info',
        message: error.message
      };
    }
  }

  async runCompleteHealthCheck() {
    console.log('🔍 Running comprehensive database health check...');

    const healthCheck = {
      timestamp: new Date().toISOString(),
      connection: await this.checkConnectionHealth(),
      performance: await this.checkIndexPerformance(),
      integrity: await this.checkDataIntegrity(),
      connectionInfo: await this.getConnectionInfo(),
      summary: {
        overall: 'healthy',
        issues: [],
        recommendations: []
      }
    };

    // Analyze results and provide recommendations
    if (healthCheck.connection.status !== 'healthy') {
      healthCheck.summary.overall = 'unhealthy';
      healthCheck.summary.issues.push('Database connection issues detected');
    }

    const slowQueries = healthCheck.performance.filter(p => p.performance === 'needs_optimization');
    if (slowQueries.length > 0) {
      healthCheck.summary.issues.push(`${slowQueries.length} queries performing slowly`);
      healthCheck.summary.recommendations.push('Consider adding indexes for slow queries');
    }

    const failedIntegrityChecks = healthCheck.integrity.filter(i => i.status === 'fail');
    if (failedIntegrityChecks.length > 0) {
      healthCheck.summary.overall = 'warning';
      healthCheck.summary.issues.push(`${failedIntegrityChecks.length} data integrity issues`);
      healthCheck.summary.recommendations.push('Review and fix data integrity issues');
    }

    return healthCheck;
  }
}

module.exports = DatabaseHealthChecker;