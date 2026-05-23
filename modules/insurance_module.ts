// src/modules/insurance/insurance.module.ts
import { Module } from '@nestjs/common';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';

@Module({
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService],
})
export class InsuranceModule {}

// src/modules/insurance/insurance.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import { CreateInsurancePolicyDto } from './dto/create-insurance-policy.dto';
import { UpdateInsurancePolicyDto } from './dto/update-insurance-policy.dto';
import { CreateInsuranceClaimDto } from './dto/create-insurance-claim.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Insurance')
@Controller('insurance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  // Insurance Policies
  @Get('cases/:caseId/policies')
  @ApiOperation({ summary: 'Get insurance policies for a case' })
  @ApiResponse({ status: 200, description: 'Insurance policies retrieved successfully' })
  getPolicies(@Param('caseId') caseId: string, @Query() query: any) {
    return this.insuranceService.getPolicies(caseId, query);
  }

  @Post('cases/:caseId/policies')
  @ApiOperation({ summary: 'Add insurance policy to case' })
  @ApiResponse({ status: 201, description: 'Insurance policy created successfully' })
  createPolicy(
    @Param('caseId') caseId: string,
    @Body() createPolicyDto: CreateInsurancePolicyDto,
  ) {
    return this.insuranceService.createPolicy(caseId, createPolicyDto);
  }

  @Patch('policies/:id')
  @ApiOperation({ summary: 'Update insurance policy' })
  @ApiResponse({ status: 200, description: 'Insurance policy updated successfully' })
  updatePolicy(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdateInsurancePolicyDto,
  ) {
    return this.insuranceService.updatePolicy(id, updatePolicyDto);
  }

  @Delete('policies/:id')
  @ApiOperation({ summary: 'Delete insurance policy' })
  @ApiResponse({ status: 200, description: 'Insurance policy deleted successfully' })
  deletePolicy(@Param('id') id: string) {
    return this.insuranceService.deletePolicy(id);
  }

  @Get('policies/:id')
  @ApiOperation({ summary: 'Get insurance policy by ID' })
  @ApiResponse({ status: 200, description: 'Insurance policy retrieved successfully' })
  getPolicy(@Param('id') id: string) {
    return this.insuranceService.getPolicy(id);
  }

  // Insurance Claims
  @Get('cases/:caseId/claims')
  @ApiOperation({ summary: 'Get insurance claims for a case' })
  @ApiResponse({ status: 200, description: 'Insurance claims retrieved successfully' })
  getClaims(@Param('caseId') caseId: string, @Query() query: any) {
    return this.insuranceService.getClaims(caseId, query);
  }

  @Post('policies/:policyId/claims')
  @ApiOperation({ summary: 'Add claim to insurance policy' })
  @ApiResponse({ status: 201, description: 'Insurance claim created successfully' })
  createClaim(
    @Param('policyId') policyId: string,
    @Body() createClaimDto: CreateInsuranceClaimDto,
  ) {
    return this.insuranceService.createClaim(policyId, createClaimDto);
  }

  @Patch('claims/:id')
  @ApiOperation({ summary: 'Update insurance claim' })
  @ApiResponse({ status: 200, description: 'Insurance claim updated successfully' })
  updateClaim(@Param('id') id: string, @Body() updateData: any) {
    return this.insuranceService.updateClaim(id, updateData);
  }

  @Delete('claims/:id')
  @ApiOperation({ summary: 'Delete insurance claim' })
  @ApiResponse({ status: 200, description: 'Insurance claim deleted successfully' })
  deleteClaim(@Param('id') id: string) {
    return this.insuranceService.deleteClaim(id);
  }

  // Insurance Summary and Analytics
  @Get('cases/:caseId/summary')
  @ApiOperation({ summary: 'Get insurance summary for a case' })
  @ApiResponse({ status: 200, description: 'Insurance summary retrieved successfully' })
  getInsuranceSummary(@Param('caseId') caseId: string) {
    return this.insuranceService.getInsuranceSummary(caseId);
  }

  @Get('cases/:caseId/coverage-analysis')
  @ApiOperation({ summary: 'Get coverage analysis for a case' })
  @ApiResponse({ status: 200, description: 'Coverage analysis retrieved successfully' })
  getCoverageAnalysis(@Param('caseId') caseId: string) {
    return this.insuranceService.getCoverageAnalysis(caseId);
  }

  // Specific Insurance Types
  @Get('cases/:caseId/auto-insurance')
  @ApiOperation({ summary: 'Get auto insurance policies for a case' })
  @ApiResponse({ status: 200, description: 'Auto insurance policies retrieved successfully' })
  getAutoInsurance(@Param('caseId') caseId: string) {
    return this.insuranceService.getAutoInsurance(caseId);
  }

  @Get('cases/:caseId/health-insurance')
  @ApiOperation({ summary: 'Get health insurance policies for a case' })
  @ApiResponse({ status: 200, description: 'Health insurance policies retrieved successfully' })
  getHealthInsurance(@Param('caseId') caseId: string) {
    return this.insuranceService.getHealthInsurance(caseId);
  }

  @Get('cases/:caseId/liability-insurance')
  @ApiOperation({ summary: 'Get liability insurance policies for a case' })
  @ApiResponse({ status: 200, description: 'Liability insurance policies retrieved successfully' })
  getLiabilityInsurance(@Param('caseId') caseId: string) {
    return this.insuranceService.getLiabilityInsurance(caseId);
  }
}

// src/modules/insurance/insurance.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInsurancePolicyDto } from './dto/create-insurance-policy.dto';
import { UpdateInsurancePolicyDto } from './dto/update-insurance-policy.dto';
import { CreateInsuranceClaimDto } from './dto/create-insurance-claim.dto';
import { InsuranceType, ClaimStatus } from '@prisma/client';

@Injectable()
export class InsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  // Insurance Policies
  async getPolicies(caseId: string, query: any) {
    const { type, status, company } = query;

    const where: any = { caseId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (company) where.company = { contains: company, mode: 'insensitive' };

    const policies = await this.prisma.insurancePolicy.findMany({
      where,
      include: {
        claims: {
          select: {
            id: true,
            claimNumber: true,
            status: true,
            amount: true,
            dateReported: true,
          },
          orderBy: { dateReported: 'desc' },
        },
        _count: {
          select: {
            claims: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' },
        { effectiveDate: 'desc' },
      ],
    });

    return policies;
  }

  async createPolicy(caseId: string, createPolicyDto: CreateInsurancePolicyDto) {
    // Verify case exists
    const caseExists = await this.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      throw new NotFoundException('Case not found');
    }

    const policy = await this.prisma.insurancePolicy.create({
      data: {
        ...createPolicyDto,
        caseId,
      },
      include: {
        claims: true,
      },
    });

    return policy;
  }

  async updatePolicy(id: string, updatePolicyDto: UpdateInsurancePolicyDto) {
    const policy = await this.prisma.insurancePolicy.findUnique({
      where: { id },
    });

    if (!policy) {
      throw new NotFoundException('Insurance policy not found');
    }

    const updatedPolicy = await this.prisma.insurancePolicy.update({
      where: { id },
      data: updatePolicyDto,
      include: {
        claims: true,
      },
    });

    return updatedPolicy;
  }

  async deletePolicy(id: string) {
    const policy = await this.prisma.insurancePolicy.findUnique({
      where: { id },
    });

    if (!policy) {
      throw new NotFoundException('Insurance policy not found');
    }

    await this.prisma.insurancePolicy.delete({
      where: { id },
    });

    return { message: 'Insurance policy deleted successfully' };
  }

  async getPolicy(id: string) {
    const policy = await this.prisma.insurancePolicy.findUnique({
      where: { id },
      include: {
        claims: {
          orderBy: { dateReported: 'desc' },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException('Insurance policy not found');
    }

    return policy;
  }

  // Insurance Claims
  async getClaims(caseId: string, query: any) {
    const { status, type, minAmount, maxAmount } = query;

    const where: any = {
      policy: {
        caseId,
      },
    };

    if (status) where.status = status;
    if (type) where.policy = { ...where.policy, type };
    if (minAmount) where.amount = { ...where.amount, gte: parseFloat(minAmount) };
    if (maxAmount) where.amount = { ...where.amount, lte: parseFloat(maxAmount) };

    const claims = await this.prisma.insuranceClaim.findMany({
      where,
      include: {
        policy: {
          select: {
            id: true,
            type: true,
            company: true,
            policyNumber: true,
          },
        },
      },
      orderBy: { dateReported: 'desc' },
    });

    return claims;
  }

  async createClaim(policyId: string, createClaimDto: CreateInsuranceClaimDto) {
    // Verify policy exists
    const policy = await this.prisma.insurancePolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new NotFoundException('Insurance policy not found');
    }

    const claim = await this.prisma.insuranceClaim.create({
      data: {
        ...createClaimDto,
        policyId,
      },
      include: {
        policy: {
          select: {
            id: true,
            type: true,
            company: true,
            policyNumber: true,
          },
        },
      },
    });

    return claim;
  }

  async updateClaim(id: string, updateData: any) {
    const claim = await this.prisma.insuranceClaim.findUnique({
      where: { id },
    });

    if (!claim) {
      throw new NotFoundException('Insurance claim not found');
    }

    const updatedClaim = await this.prisma.insuranceClaim.update({
      where: { id },
      data: updateData,
      include: {
        policy: {
          select: {
            id: true,
            type: true,
            company: true,
            policyNumber: true,
          },
        },
      },
    });

    return updatedClaim;
  }

  async deleteClaim(id: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({
      where: { id },
    });

    if (!claim) {
      throw new NotFoundException('Insurance claim not found');
    }

    await this.prisma.insuranceClaim.delete({
      where: { id },
    });

    return { message: 'Insurance claim deleted successfully' };
  }

  // Insurance Summary and Analytics
  async getInsuranceSummary(caseId: string) {
    const [policies, claims, totals] = await Promise.all([
      this.prisma.insurancePolicy.count({
        where: { caseId },
      }),
      this.prisma.insuranceClaim.count({
        where: {
          policy: { caseId },
        },
      }),
      this.prisma.insuranceClaim.aggregate({
        where: {
          policy: { caseId },
        },
        _sum: {
          amount: true,
        },
        _avg: {
          amount: true,
        },
      }),
    ]);

    // Get claims by status
    const claimsByStatus = await this.prisma.insuranceClaim.groupBy({
      by: ['status'],
      where: {
        policy: { caseId },
      },
      _count: true,
      _sum: {
        amount: true,
      },
    });

    // Get policies by type
    const policiesByType = await this.prisma.insurancePolicy.groupBy({
      by: ['type'],
      where: { caseId },
      _count: true,
      _sum: {
        premium: true,
      },
    });

    return {
      summary: {
        totalPolicies: policies,
        totalClaims: claims,
        totalClaimAmount: totals._sum.amount || 0,
        averageClaimAmount: totals._avg.amount || 0,
      },
      claimsByStatus: claimsByStatus.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = {
          count: item._count,
          totalAmount: item._sum.amount || 0,
        };
        return acc;
      }, {}),
      policiesByType: policiesByType.reduce((acc, item) => {
        acc[item.type.toLowerCase()] = {
          count: item._count,
          totalPremium: item._sum.premium || 0,
        };
        return acc;
      }, {}),
    };
  }

  async getCoverageAnalysis(caseId: string) {
    const policies = await this.prisma.insurancePolicy.findMany({
      where: { caseId },
      include: {
        claims: true,
      },
    });

    const analysis = {
      autoInsurance: {
        present: false,
        policies: [],
        totalCoverage: 0,
        activeClaims: 0,
      },
      healthInsurance: {
        present: false,
        policies: [],
        totalCoverage: 0,
        activeClaims: 0,
      },
      liabilityInsurance: {
        present: false,
        policies: [],
        totalCoverage: 0,
        activeClaims: 0,
      },
      umbrellaInsurance: {
        present: false,
        policies: [],
        totalCoverage: 0,
        activeClaims: 0,
      },
      gaps: [],
      recommendations: [],
    };

    policies.forEach(policy => {
      const activeClaims = policy.claims.filter(claim => 
        claim.status === ClaimStatus.OPEN || claim.status === ClaimStatus.PENDING
      ).length;

      switch (policy.type) {
        case InsuranceType.AUTO:
          analysis.autoInsurance.present = true;
          analysis.autoInsurance.policies.push(policy);
          analysis.autoInsurance.activeClaims += activeClaims;
          break;
        case InsuranceType.HEALTH:
          analysis.healthInsurance.present = true;
          analysis.healthInsurance.policies.push(policy);
          analysis.healthInsurance.activeClaims += activeClaims;
          break;
        case InsuranceType.LIABILITY:
          analysis.liabilityInsurance.present = true;
          analysis.liabilityInsurance.policies.push(policy);
          analysis.liabilityInsurance.activeClaims += activeClaims;
          break;
        case InsuranceType.UMBRELLA:
          analysis.umbrellaInsurance.present = true;
          analysis.umbrellaInsurance.policies.push(policy);
          analysis.umbrellaInsurance.activeClaims += activeClaims;
          break;
      }
    });

    // Identify gaps and make recommendations
    if (!analysis.autoInsurance.present) {
      analysis.gaps.push('No auto insurance policy found');
      analysis.recommendations.push('Add auto insurance policy information');
    }

    if (!analysis.healthInsurance.present) {
      analysis.gaps.push('No health insurance policy found');
      analysis.recommendations.push('Add health insurance policy information');
    }

    if (!analysis.liabilityInsurance.present && !analysis.umbrellaInsurance.present) {
      analysis.gaps.push('No liability or umbrella insurance found');
      analysis.recommendations.push('Check for additional liability coverage');
    }

    return analysis;
  }

  // Specific Insurance Types
  async getAutoInsurance(caseId: string) {
    return this.getPolicies(caseId, { type: InsuranceType.AUTO });
  }

  async getHealthInsurance(caseId: string) {
    return this.getPolicies(caseId, { type: InsuranceType.HEALTH });
  }

  async getLiabilityInsurance(caseId: string) {
    const [liability, umbrella] = await Promise.all([
      this.getPolicies(caseId, { type: InsuranceType.LIABILITY }),
      this.getPolicies(caseId, { type: InsuranceType.UMBRELLA }),
    ]);

    return {
      liability,
      umbrella,
      combined: [...liability, ...umbrella],
    };
  }
}

// src/modules/insurance/dto/create-insurance-policy.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsDecimal,
  IsObject,
} from 'class-validator';
import { InsuranceType, PolicyStatus } from '@prisma/client';

export class CreateInsurancePolicyDto {
  @ApiProperty({ enum: InsuranceType, example: InsuranceType.AUTO })
  @IsEnum(InsuranceType)
  type: InsuranceType;

  @ApiProperty({ example: 'State Farm' })
  @IsNotEmpty()
  @IsString()
  company: string;

  @ApiProperty({ example: 'SF-789456123' })
  @IsNotEmpty()
  @IsString()
  policyNumber: string;

  @ApiProperty({ example: 'Patricia Thowerd' })
  @IsNotEmpty()
  @IsString()
  policyHolder: string;

  @ApiProperty({ example: '2015-01-15' })
  @IsNotEmpty()
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({ example: '2016-01-15' })
  @IsNotEmpty()
  @IsDateString()
  expirationDate: string;

  @ApiProperty({ example: 1200.00 })
  @IsNotEmpty()
  @IsDecimal()
  premium: number;

  @ApiPropertyOptional({ example: 500.00 })
  @IsOptional()
  @IsDecimal()
  deductible?: number = 0;

  @ApiPropertyOptional({ enum: PolicyStatus, example: PolicyStatus.ACTIVE })
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus = PolicyStatus.ACTIVE;

  @ApiProperty({
    example: {
      bodilyInjury: '$100,000/$300,000',
      propertyDamage: '$50,000',
      uninsuredMotorist: '$100,000/$300,000',
      medicalPayments: '$5,000',
      collision: '$500 deductible',
      comprehensive: '$250 deductible',
    },
  })
  @IsNotEmpty()
  @IsObject()
  coverageLimits: Record<string, any>;

  @ApiPropertyOptional({ example: 'Sarah Martinez' })
  @IsOptional()
  @IsString()
  agentName?: string;

  @ApiPropertyOptional({ example: '(714) 555-0123' })
  @IsOptional()
  @IsString()
  agentPhone?: string;

  @ApiPropertyOptional({ example: 'smartinez@statefarm.com' })
  @IsOptional()
  @IsString()
  agentEmail?: string;
}

// src/modules/insurance/dto/update-insurance-policy.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateInsurancePolicyDto } from './create-insurance-policy.dto';

export class UpdateInsurancePolicyDto extends PartialType(CreateInsurancePolicyDto) {}

// src/modules/insurance/dto/create-insurance-claim.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsDecimal,
} from 'class-validator';
import { ClaimStatus } from '@prisma/client';

export class CreateInsuranceClaimDto {
  @ApiProperty({ example: 'SF-2015-09-456123' })
  @IsNotEmpty()
  @IsString()
  claimNumber: string;

  @ApiProperty({ example: '2015-09-20' })
  @IsNotEmpty()
  @IsDateString()
  dateReported: string;

  @ApiPropertyOptional({ enum: ClaimStatus, example: ClaimStatus.OPEN })
  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus = ClaimStatus.OPEN;

  @ApiProperty({ example: 25000.00 })
  @IsNotEmpty()
  @IsDecimal()
  amount: number;

  @ApiProperty({ example: 'Auto accident claim for vehicle damage and medical expenses' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 'John Smith' })
  @IsOptional()
  @IsString()
  adjusterName?: string;

  @ApiPropertyOptional({ example: '(714) 555-0789' })
  @IsOptional()
  @IsString()
  adjusterPhone?: string;
}