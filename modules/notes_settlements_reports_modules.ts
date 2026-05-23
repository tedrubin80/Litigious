// ============================================================================
// NOTES MODULE
// ============================================================================

// src/modules/notes/notes.module.ts
import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}

// src/modules/notes/notes.controller.ts
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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notes')
@Controller('notes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('cases/:caseId')
  @ApiOperation({ summary: 'Get notes for a case' })
  @ApiResponse({ status: 200, description: 'Notes retrieved successfully' })
  getNotes(@Param('caseId') caseId: string, @Query() queryDto: QueryNotesDto) {
    return this.notesService.getNotes(caseId, queryDto);
  }

  @Post('cases/:caseId')
  @ApiOperation({ summary: 'Create note for case' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  createNote(
    @Param('caseId') caseId: string,
    @Body() createNoteDto: CreateNoteDto,
    @Request() req,
  ) {
    return this.notesService.createNote(caseId, createNoteDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get note by ID' })
  @ApiResponse({ status: 200, description: 'Note retrieved successfully' })
  getNote(@Param('id') id: string) {
    return this.notesService.getNote(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update note' })
  @ApiResponse({ status: 200, description: 'Note updated successfully' })
  updateNote(@Param('id') id: string, @Body() updateNoteDto: UpdateNoteDto) {
    return this.notesService.updateNote(id, updateNoteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete note' })
  @ApiResponse({ status: 200, description: 'Note deleted successfully' })
  deleteNote(@Param('id') id: string) {
    return this.notesService.deleteNote(id);
  }

  @Get('cases/:caseId/summary')
  @ApiOperation({ summary: 'Get notes summary for a case' })
  @ApiResponse({ status: 200, description: 'Notes summary retrieved successfully' })
  getNotesSummary(@Param('caseId') caseId: string) {
    return this.notesService.getNotesSummary(caseId);
  }

  @Get('cases/:caseId/timeline')
  @ApiOperation({ summary: 'Get notes timeline for a case' })
  @ApiResponse({ status: 200, description: 'Notes timeline retrieved successfully' })
  getNotesTimeline(@Param('caseId') caseId: string) {
    return this.notesService.getNotesTimeline(caseId);
  }
}

// src/modules/notes/notes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotes(caseId: string, queryDto: QueryNotesDto) {
    const { page = 1, limit = 20, type, search, authorId, dateFrom, dateTo } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { caseId };
    if (type) where.type = type;
    if (authorId) where.authorId = authorId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [notes, total] = await Promise.all([
      this.prisma.caseNote.findMany({
        where,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.caseNote.count({ where }),
    ]);

    return {
      data: notes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createNote(caseId: string, createNoteDto: CreateNoteDto, authorId: string) {
    // Verify case exists
    const caseExists = await this.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      throw new NotFoundException('Case not found');
    }

    const note = await this.prisma.caseNote.create({
      data: {
        ...createNoteDto,
        caseId,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return note;
  }

  async getNote(id: string) {
    const note = await this.prisma.caseNote.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async updateNote(id: string, updateNoteDto: UpdateNoteDto) {
    const note = await this.getNote(id);

    const updatedNote = await this.prisma.caseNote.update({
      where: { id },
      data: updateNoteDto,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedNote;
  }

  async deleteNote(id: string) {
    const note = await this.getNote(id);

    await this.prisma.caseNote.delete({
      where: { id },
    });

    return { message: 'Note deleted successfully' };
  }

  async getNotesSummary(caseId: string) {
    const [total, byType, recentNotes] = await Promise.all([
      this.prisma.caseNote.count({ where: { caseId } }),
      this.prisma.caseNote.groupBy({
        by: ['type'],
        where: { caseId },
        _count: true,
      }),
      this.prisma.caseNote.findMany({
        where: { caseId },
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      total,
      byType: byType.reduce((acc, item) => {
        acc[item.type.toLowerCase()] = item._count;
        return acc;
      }, {}),
      recentNotes: recentNotes.map(note => ({
        id: note.id,
        title: note.title || 'Untitled Note',
        content: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
        type: note.type,
        author: `${note.author.firstName} ${note.author.lastName}`,
        createdAt: note.createdAt,
      })),
    };
  }

  async getNotesTimeline(caseId: string) {
    const notes = await this.prisma.caseNote.findMany({
      where: { caseId },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return notes.map(note => ({
      id: note.id,
      type: 'note',
      title: note.title || `${note.type} Note`,
      content: note.content,
      author: `${note.author.firstName} ${note.author.lastName}`,
      date: note.createdAt,
      noteType: note.type,
    }));
  }
}

// src/modules/notes/dto/create-note.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { NoteType } from '@prisma/client';

export class CreateNoteDto {
  @ApiPropertyOptional({ example: 'Client Phone Call - Initial Consultation' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Spoke with client about accident details. Client reported severe pain in right knee...' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: NoteType, example: NoteType.PHONE_CALL })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType = NoteType.GENERAL;
}

// src/modules/notes/dto/update-note.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateNoteDto } from './create-note.dto';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {}

// src/modules/notes/dto/query-notes.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max, IsString, IsDateString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { NoteType } from '@prisma/client';

export class QueryNotesDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: NoteType })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @ApiPropertyOptional({ example: 'phone call' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'user-uuid-here' })
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

// ============================================================================
// SETTLEMENTS MODULE
// ============================================================================

// src/modules/settlements/settlements.module.ts
import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';

@Module({
  controllers: [SettlementsController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule {}

// src/modules/settlements/settlements.controller.ts
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
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { UpdateSettlementDto } from './dto/update-settlement.dto';
import { CreateLienDto } from './dto/create-lien.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Settlements')
@Controller('settlements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  // Settlements
  @Get('cases/:caseId')
  @ApiOperation({ summary: 'Get settlements for a case' })
  @ApiResponse({ status: 200, description: 'Settlements retrieved successfully' })
  getSettlements(@Param('caseId') caseId: string, @Query() query: any) {
    return this.settlementsService.getSettlements(caseId, query);
  }

  @Post('cases/:caseId')
  @ApiOperation({ summary: 'Create settlement for case' })
  @ApiResponse({ status: 201, description: 'Settlement created successfully' })
  createSettlement(
    @Param('caseId') caseId: string,
    @Body() createSettlementDto: CreateSettlementDto,
  ) {
    return this.settlementsService.createSettlement(caseId, createSettlementDto);
  }

  @Get('settlements/:id')
  @ApiOperation({ summary: 'Get settlement by ID' })
  @ApiResponse({ status: 200, description: 'Settlement retrieved successfully' })
  getSettlement(@Param('id') id: string) {
    return this.settlementsService.getSettlement(id);
  }

  @Patch('settlements/:id')
  @ApiOperation({ summary: 'Update settlement' })
  @ApiResponse({ status: 200, description: 'Settlement updated successfully' })
  updateSettlement(@Param('id') id: string, @Body() updateSettlementDto: UpdateSettlementDto) {
    return this.settlementsService.updateSettlement(id, updateSettlementDto);
  }

  @Delete('settlements/:id')
  @ApiOperation({ summary: 'Delete settlement' })
  @ApiResponse({ status: 200, description: 'Settlement deleted successfully' })
  deleteSettlement(@Param('id') id: string) {
    return this.settlementsService.deleteSettlement(id);
  }

  // Liens
  @Get('cases/:caseId/liens')
  @ApiOperation({ summary: 'Get liens for a case' })
  @ApiResponse({ status: 200, description: 'Liens retrieved successfully' })
  getLiens(@Param('caseId') caseId: string, @Query() query: any) {
    return this.settlementsService.getLiens(caseId, query);
  }

  @Post('cases/:caseId/liens')
  @ApiOperation({ summary: 'Create lien for case' })
  @ApiResponse({ status: 201, description: 'Lien created successfully' })
  createLien(@Param('caseId') caseId: string, @Body() createLienDto: CreateLienDto) {
    return this.settlementsService.createLien(caseId, createLienDto);
  }

  @Patch('liens/:id')
  @ApiOperation({ summary: 'Update lien' })
  @ApiResponse({ status: 200, description: 'Lien updated successfully' })
  updateLien(@Param('id') id: string, @Body() updateData: any) {
    return this.settlementsService.updateLien(id, updateData);
  }

  @Delete('liens/:id')
  @ApiOperation({ summary: 'Delete lien' })
  @ApiResponse({ status: 200, description: 'Lien deleted successfully' })
  deleteLien(@Param('id') id: string) {
    return this.settlementsService.deleteLien(id);
  }

  @Patch('liens/:id/resolve')
  @ApiOperation({ summary: 'Mark lien as resolved' })
  @ApiResponse({ status: 200, description: 'Lien marked as resolved' })
  resolveLien(@Param('id') id: string) {
    return this.settlementsService.resolveLien(id);
  }

  // Settlement Analysis
  @Get('cases/:caseId/analysis')
  @ApiOperation({ summary: 'Get settlement analysis for a case' })
  @ApiResponse({ status: 200, description: 'Settlement analysis retrieved successfully' })
  getSettlementAnalysis(@Param('caseId') caseId: string) {
    return this.settlementsService.getSettlementAnalysis(caseId);
  }

  @Get('cases/:caseId/calculation')
  @ApiOperation({ summary: 'Calculate potential settlement for a case' })
  @ApiResponse({ status: 200, description: 'Settlement calculation completed' })
  calculateSettlement(@Param('caseId') caseId: string) {
    return this.settlementsService.calculateSettlement(caseId);
  }
}

// src/modules/settlements/settlements.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { UpdateSettlementDto } from './dto/update-settlement.dto';
import { CreateLienDto } from './dto/create-lien.dto';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  // Settlements
  async getSettlements(caseId: string, query: any) {
    const { type, status } = query;

    const where: any = { caseId };
    if (type) where.type = type;
    if (status) where.status = status;

    const settlements = await this.prisma.settlement.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return settlements;
  }

  async createSettlement(caseId: string, createSettlementDto: CreateSettlementDto) {
    // Verify case exists
    const caseExists = await this.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      throw new NotFoundException('Case not found');
    }

    const settlement = await this.prisma.settlement.create({
      data: {
        ...createSettlementDto,
        caseId,
      },
    });

    return settlement;
  }

  async getSettlement(id: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: {
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

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    return settlement;
  }

  async updateSettlement(id: string, updateSettlementDto: UpdateSettlementDto) {
    const settlement = await this.getSettlement(id);

    const updatedSettlement = await this.prisma.settlement.update({
      where: { id },
      data: updateSettlementDto,
    });

    return updatedSettlement;
  }

  async deleteSettlement(id: string) {
    const settlement = await this.getSettlement(id);

    await this.prisma.settlement.delete({
      where: { id },
    });

    return { message: 'Settlement deleted successfully' };
  }

  // Liens
  async getLiens(caseId: string, query: any) {
    const { type, resolved } = query;

    const where: any = { caseId };
    if (type) where.type = type;
    if (resolved !== undefined) where.resolved = resolved === 'true';

    const liens = await this.prisma.lien.findMany({
      where,
      orderBy: [
        { resolved: 'asc' },
        { amount: 'desc' },
      ],
    });

    return liens;
  }

  async createLien(caseId: string, createLienDto: CreateLienDto) {
    // Verify case exists
    const caseExists = await this.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      throw new NotFoundException('Case not found');
    }

    const lien = await this.prisma.lien.create({
      data: {
        ...createLienDto,
        caseId,
      },
    });

    return lien;
  }

  async updateLien(id: string, updateData: any) {
    const lien = await this.prisma.lien.findUnique({
      where: { id },
    });

    if (!lien) {
      throw new NotFoundException('Lien not found');
    }

    const updatedLien = await this.prisma.lien.update({
      where: { id },
      data: updateData,
    });

    return updatedLien;
  }

  async deleteLien(id: string) {
    const lien = await this.prisma.lien.findUnique({
      where: { id },
    });

    if (!lien) {
      throw new NotFoundException('Lien not found');
    }

    await this.prisma.lien.delete({
      where: { id },
    });

    return { message: 'Lien deleted successfully' };
  }

  async resolveLien(id: string) {
    const lien = await this.prisma.lien.findUnique({
      where: { id },
    });

    if (!lien) {
      throw new NotFoundException('Lien not found');
    }

    const updatedLien = await this.prisma.lien.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    return updatedLien;
  }

  // Settlement Analysis
  async getSettlementAnalysis(caseId: string) {
    const [settlements, liens, medicalBills, expenses] = await Promise.all([
      this.getSettlements(caseId, {}),
      this.getLiens(caseId, {}),
      this.prisma.medicalProvider.aggregate({
        where: { caseId },
        _sum: { totalBills: true },
      }),
      this.prisma.insuranceClaim.aggregate({
        where: { policy: { caseId } },
        _sum: { amount: true },
      }),
    ]);

    const totalMedicalBills = medicalBills._sum.totalBills || 0;
    const totalInsuranceClaims = expenses._sum.amount || 0;
    const totalLiens = liens.reduce((sum, lien) => sum + Number(lien.amount), 0);
    const unresolvedLiens = liens.filter(lien => !lien.resolved);

    const totalSettlements = settlements.reduce((sum, settlement) => sum + Number(settlement.amount), 0);
    const totalAttorneyFees = settlements.reduce((sum, settlement) => sum + Number(settlement.attorneyFees), 0);
    const totalCosts = settlements.reduce((sum, settlement) => sum + Number(settlement.costs), 0);
    const totalNetToClient = settlements.reduce((sum, settlement) => sum + Number(settlement.netToClient), 0);

    return {
      settlements: {
        total: settlements.length,
        totalAmount: totalSettlements,
        totalAttorneyFees,
        totalCosts,
        totalNetToClient,
      },
      liens: {
        total: liens.length,
        unresolved: unresolvedLiens.length,
        totalAmount: totalLiens,
        unresolvedAmount: unresolvedLiens.reduce((sum, lien) => sum + Number(lien.amount), 0),
      },
      expenses: {
        totalMedicalBills,
        totalInsuranceClaims,
        totalExpenses: totalMedicalBills + totalInsuranceClaims,
      },
      netRecovery: totalNetToClient,
    };
  }

  async calculateSettlement(caseId: string) {
    const analysis = await this.getSettlementAnalysis(caseId);
    
    // Basic settlement calculation (this would be more sophisticated in a real system)
    const medicalMultiplier = 3; // Common multiplier for pain and suffering
    const painAndSuffering = Number(analysis.expenses.totalMedicalBills) * medicalMultiplier;
    const economicDamages = Number(analysis.expenses.totalMedicalBills);
    const totalDamages = economicDamages + painAndSuffering;
    
    // Standard attorney fee (33.33%)
    const attorneyFeeRate = 0.3333;
    const attorneyFees = totalDamages * attorneyFeeRate;
    
    // Estimated costs (5% of damages)
    const estimatedCosts = totalDamages * 0.05;
    
    // Net to client after fees, costs, and liens
    const netBeforeLiens = totalDamages - attorneyFees - estimatedCosts;
    const netToClient = netBeforeLiens - Number(analysis.liens.totalAmount);

    return {
      estimatedValue: {
        economicDamages,
        painAndSuffering,
        totalDamages,
      },
      deductions: {
        attorneyFees,
        estimatedCosts,
        liens: analysis.liens.totalAmount,
        totalDeductions: attorneyFees + estimatedCosts + Number(analysis.liens.totalAmount),
      },
      netToClient: Math.max(0, netToClient), // Ensure non-negative
      recommendation: this.generateSettlementRecommendation(totalDamages, analysis),
    };
  }

  private generateSettlementRecommendation(totalDamages: number, analysis: any): string {
    if (totalDamages < 10000) {
      return 'Consider small claims court or direct negotiation with insurance';
    } else if (totalDamages < 50000) {
      return 'Good candidate for settlement negotiation with insurance company';
    } else if (totalDamages < 100000) {
      return 'Consider formal demand letter and mediation if initial offer is low';
    } else {
      return 'High-value case - consider litigation if settlement offers are inadequate';
    }
  }
}

// DTOs for Settlements
// src/modules/settlements/dto/create-settlement.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDecimal,
  IsDateString,
  IsString,
} from 'class-validator';
import { SettlementType, SettlementStatus } from '@prisma/client';

export class CreateSettlementDto {
  @ApiProperty({ enum: SettlementType, example: SettlementType.DEMAND })
  @IsEnum(SettlementType)
  type: SettlementType;

  @ApiProperty({ example: 100000.00 })
  @IsNotEmpty()
  @IsDecimal()
  amount: number;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: SettlementStatus, example: SettlementStatus.NEGOTIATING })
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus = SettlementStatus.NEGOTIATING;

  @ApiPropertyOptional({ example: 'Initial settlement demand based on medical expenses and pain/suffering' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 33333.33 })
  @IsOptional()
  @IsDecimal()
  attorneyFees?: number = 0;

  @ApiPropertyOptional({ example: 5000.00 })
  @IsOptional()
  @IsDecimal()
  costs?: number = 0;

  @ApiPropertyOptional({ example: 61666.67 })
  @IsOptional()
  @IsDecimal()
  netToClient?: number = 0;
}

// src/modules/settlements/dto/update-settlement.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateSettlementDto } from './create-settlement.dto';

export class UpdateSettlementDto extends PartialType(CreateSettlementDto) {}

// src/modules/settlements/dto/create-lien.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDecimal,
  IsBoolean,
} from 'class-validator';
import { LienType } from '@prisma/client';

export class CreateLienDto {
  @ApiProperty({ enum: LienType, example: LienType.MEDICAL })
  @IsEnum(LienType)
  type: LienType;

  @ApiProperty({ example: 'Newport Beach Medical Center' })
  @IsNotEmpty()
  @IsString()
  creditor: string;

  @ApiProperty({ example: 15420.00 })
  @IsNotEmpty()
  @IsDecimal()
  amount: number;

  @ApiPropertyOptional({ example: 'Emergency room treatment and diagnostic imaging' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  resolved?: boolean = false;
}

// ============================================================================
// REPORTS MODULE
// ============================================================================

// src/modules/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

// src/modules/reports/reports.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  getDashboardStats(@Query() query: ReportQueryDto) {
    return this.reportsService.getDashboardStats(query);
  }

  @Get('cases/:caseId/summary')
  @ApiOperation({ summary: 'Get comprehensive case summary report' })
  @ApiResponse({ status: 200, description: 'Case summary report generated successfully' })
  getCaseSummaryReport(@Param('caseId') caseId: string) {
    return this.reportsService.getCaseSummaryReport(caseId);
  }

  @Get('cases/:caseId/financial')
  @ApiOperation({ summary: 'Get financial report for a case' })
  @ApiResponse({ status: 200, description: 'Financial report generated successfully' })
  getFinancialReport(@Param('caseId') caseId: string) {
    return this.reportsService.getFinancialReport(caseId);
  }

  @Get('cases/:caseId/medical')
  @ApiOperation({ summary: 'Get medical report for a case' })
  @ApiResponse({ status: 200, description: 'Medical report generated successfully' })
  getMedicalReport(@Param('caseId') caseId: string) {
    return this.reportsService.getMedicalReport(caseId);
  }

  @Get('productivity')
  @ApiOperation({ summary: 'Get productivity report' })
  @ApiResponse({ status: 200, description: 'Productivity report generated successfully' })
  getProductivityReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getProductivityReport(query);
  }

  @Get('financial-overview')
  @ApiOperation({ summary: 'Get financial overview report' })
  @ApiResponse({ status: 200, description: 'Financial overview generated successfully' })
  getFinancialOverview(@Query() query: ReportQueryDto) {
    return this.reportsService.getFinancialOverview(query);
  }

  @Post('custom')
  @ApiOperation({ summary: 'Generate custom report' })
  @ApiResponse({ status: 200, description: 'Custom report generated successfully' })
  generateCustomReport(@Body() generateReportDto: GenerateReportDto) {
    return this.reportsService.generateCustomReport(generateReportDto);
  }
}

// src/modules/reports/reports.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(query: ReportQueryDto) {
    const { dateFrom, dateTo, userId } = query;
    
    const dateFilter = this.buildDateFilter(dateFrom, dateTo);
    const userFilter = userId ? { createdById: userId } : {};

    const [
      totalCases,
      activeCases,
      totalClients,
      totalTasks,
      pendingTasks,
      totalSettlements,
      totalMedicalBills,
      recentCases
    ] = await Promise.all([
      this.prisma.case.count({
        where: { ...userFilter, ...dateFilter },
      }),
      this.prisma.case.count({
        where: { ...userFilter, status: 'ACTIVE' },
      }),
      this.prisma.client.count({
        where: { active: true },
      }),
      this.prisma.caseTask.count({
        where: { ...dateFilter },
      }),
      this.prisma.caseTask.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.settlement.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.medicalProvider.aggregate({
        _sum: { totalBills: true },
      }),
      this.prisma.case.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      overview: {
        totalCases,
        activeCases,
        totalClients,
        totalTasks,
        pendingTasks,
        completionRate: totalTasks > 0 ? ((totalTasks - pendingTasks) / totalTasks * 100).toFixed(1) : 0,
      },
      financial: {
        totalSettlements: totalSettlements._sum.amount || 0,
        settlementCount: totalSettlements._count,
        totalMedicalBills: totalMedicalBills._sum.totalBills || 0,
        averageSettlement: totalSettlements._count > 0 
          ? Number(totalSettlements._sum.amount) / totalSettlements._count 
          : 0,
      },
      recentActivity: recentCases.map(case => ({
        id: case.id,
        caseNumber: case.caseNumber,
        title: case.title,
        client: `${case.client.firstName} ${case.client.lastName}`,
        status: case.status,
        createdAt: case.createdAt,
      })),
    };
  }

  async getCaseSummaryReport(caseId: string) {
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        client: {
          include: {
            contacts: true,
            emergencyContacts: true,
            familyMembers: true,
            employment: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: { firstName: true, lastName: true, role: true },
            },
          },
        },
        medicalProviders: true,
        injuries: true,
        incident: {
          include: {
            policeReport: true,
          },
        },
        vehicles: true,
        witnesses: true,
        insurancePolicies: {
          include: { claims: true },
        },
        settlements: true,
        liens: true,
        tasks: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        },
        notes: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    const totalMedicalBills = caseData.medicalProviders.reduce(
      (sum, provider) => sum + Number(provider.totalBills), 0
    );

    const totalSettlements = caseData.settlements.reduce(
      (sum, settlement) => sum + Number(settlement.amount), 0
    );

    const totalLiens = caseData.liens.reduce(
      (sum, lien) => sum + Number(lien.amount), 0
    );

    return {
      case: {
        id: caseData.id,
        caseNumber: caseData.caseNumber,
        title: caseData.title,
        caseType: caseData.caseType,
        status: caseData.status,
        dateOfLoss: caseData.dateOfLoss,
        description: caseData.description,
      },
      client: caseData.client,
      team: caseData.assignments,
      medical: {
        providers: caseData.medicalProviders.length,
        totalBills: totalMedicalBills,
        injuries: caseData.injuries,
      },
      incident: caseData.incident,
      vehicles: caseData.vehicles,
      witnesses: caseData.witnesses,
      insurance: {
        policies: caseData.insurancePolicies.length,
        totalClaims: caseData.insurancePolicies.reduce(
          (sum, policy) => sum + policy.claims.length, 0
        ),
      },
      financial: {
        totalMedicalBills,
        totalSettlements,
        totalLiens,
        netRecovery: totalSettlements - totalLiens,
      },
      activity: {
        pendingTasks: caseData.tasks.length,
        recentNotes: caseData.notes.length,
      },
    };
  }

  async getFinancialReport(caseId: string) {
    const [medicalProviders, settlements, liens, insuranceClaims] = await Promise.all([
      this.prisma.medicalProvider.findMany({
        where: { caseId },
        include: { medicalRecords: true },
      }),
      this.prisma.settlement.findMany({
        where: { caseId },
      }),
      this.prisma.lien.findMany({
        where: { caseId },
      }),
      this.prisma.insuranceClaim.findMany({
        where: { policy: { caseId } },
        include: { policy: true },
      }),
    ]);

    const totalMedicalBills = medicalProviders.reduce(
      (sum, provider) => sum + Number(provider.totalBills), 0
    );

    const totalSettlements = settlements.reduce(
      (sum, settlement) => sum + Number(settlement.amount), 0
    );

    const totalLiens = liens.reduce(
      (sum, lien) => sum + Number(lien.amount), 0
    );

    const unresolvedLiens = liens.filter(lien => !lien.resolved);

    return {
      medical: {
        totalBills: totalMedicalBills,
        providerCount: medicalProviders.length,
        largestBill: Math.max(...medicalProviders.map(p => Number(p.totalBills))),
        providers: medicalProviders.map(provider => ({
          name: provider.name,
          type: provider.type,
          totalBills: provider.totalBills,
          recordCount: provider.medicalRecords.length,
        })),
      },
      settlements: {
        total: totalSettlements,
        count: settlements.length,
        average: settlements.length > 0 ? totalSettlements / settlements.length : 0,
        details: settlements,
      },
      liens: {
        total: totalLiens,
        unresolved: unresolvedLiens.length,
        unresolvedAmount: unresolvedLiens.reduce(
          (sum, lien) => sum + Number(lien.amount), 0
        ),
        details: liens,
      },
      insurance: {
        claimsCount: insuranceClaims.length,
        totalClaimAmount: insuranceClaims.reduce(
          (sum, claim) => sum + Number(claim.amount), 0
        ),
        claims: insuranceClaims,
      },
      summary: {
        totalExpenses: totalMedicalBills + totalLiens,
        totalRecovery: totalSettlements,
        netResult: totalSettlements - totalMedicalBills - totalLiens,
      },
    };
  }

  async getMedicalReport(caseId: string) {
    const [providers, records, injuries] = await Promise.all([
      this.prisma.medicalProvider.findMany({
        where: { caseId },
        include: { medicalRecords: true },
        orderBy: { dateFirstSeen: 'asc' },
      }),
      this.prisma.medicalRecord.findMany({
        where: { caseId },
        include: { provider: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.injury.findMany({
        where: { caseId },
        orderBy: { dateReported: 'asc' },
      }),
    ]);

    const treatmentTimeline = records.map(record => ({
      date: record.date,
      provider: record.provider?.name || 'Unknown Provider',
      type: record.type,
      description: record.description,
      cost: record.cost,
      billReceived: record.billReceived,
      recordsReceived: record.recordsReceived,
    }));

    const providerSummary = providers.map(provider => ({
      name: provider.name,
      type: provider.type,
      dateFirstSeen: provider.dateFirstSeen,
      dateLastSeen: provider.dateLastSeen,
      totalBills: provider.totalBills,
      recordCount: provider.medicalRecords.length,
      billsReceived: provider.medicalRecords.filter(r => r.billReceived).length,
      recordsReceived: provider.medicalRecords.filter(r => r.recordsReceived).length,
    }));

    return {
      injuries: injuries.map(injury => ({
        bodyPart: injury.bodyPart,
        description: injury.description,
        severity: injury.severity,
        dateReported: injury.dateReported,
        currentStatus: injury.currentStatus,
        resolved: injury.resolved,
      })),
      providers: providerSummary,
      treatmentTimeline,
      summary: {
        totalProviders: providers.length,
        totalRecords: records.length,
        totalBills: providers.reduce((sum, p) => sum + Number(p.totalBills), 0),
        billsReceived: records.filter(r => r.billReceived).length,
        recordsReceived: records.filter(r => r.recordsReceived).length,
        injuryCount: injuries.length,
        resolvedInjuries: injuries.filter(i => i.resolved).length,
      },
    };
  }

  async getProductivityReport(query: ReportQueryDto) {
    const { dateFrom, dateTo, userId } = query;
    const dateFilter = this.buildDateFilter(dateFrom, dateTo);

    const [taskStats, caseStats, userActivity] = await Promise.all([
      this.prisma.caseTask.groupBy({
        by: ['status', 'createdById'],
        where: { ...dateFilter, ...(userId && { createdById: userId }) },
        _count: true,
      }),
      this.prisma.case.groupBy({
        by: ['status', 'createdById'],
        where: { ...dateFilter, ...(userId && { createdById: userId }) },
        _count: true,
      }),
      this.prisma.user.findMany({
        where: userId ? { id: userId } : {},
        include: {
          _count: {
            select: {
              createdTasks: true,
              assignedTasks: true,
              createdCases: true,
            },
          },
        },
      }),
    ]);

    return {
      taskProductivity: taskStats,
      caseProductivity: caseStats,
      userActivity: userActivity.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        tasksCreated: user._count.createdTasks,
        tasksAssigned: user._count.assignedTasks,
        casesCreated: user._count.createdCases,
      })),
    };
  }

  async getFinancialOverview(query: ReportQueryDto) {
    const { dateFrom, dateTo } = query;
    
    const [settlements, medicalBills, liens] = await Promise.all([
      this.prisma.settlement.findMany({
        where: this.buildDateFilter(dateFrom, dateTo, 'date'),
        include: { case: { select: { caseNumber: true, title: true } } },
      }),
      this.prisma.medicalProvider.aggregate({
        _sum: { totalBills: true },
        _count: true,
      }),
      this.prisma.lien.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { resolved: false },
      }),
    ]);

    const totalSettlements = settlements.reduce(
      (sum, s) => sum + Number(s.amount), 0
    );

    const totalAttorneyFees = settlements.reduce(
      (sum, s) => sum + Number(s.attorneyFees), 0
    );

    return {
      revenue: {
        totalSettlements,
        totalAttorneyFees,
        averageSettlement: settlements.length > 0 ? totalSettlements / settlements.length : 0,
        settlementCount: settlements.length,
      },
      expenses: {
        totalMedicalBills: medicalBills._sum.totalBills || 0,
        unresolvedLiens: liens._sum.amount || 0,
        medicalProviderCount: medicalBills._count,
        lienCount: liens._count,
      },
      recentSettlements: settlements.slice(-10).map(s => ({
        id: s.id,
        amount: s.amount,
        date: s.date,
        case: s.case.title,
        caseNumber: s.case.caseNumber,
        type: s.type,
        status: s.status,
      })),
    };
  }

  async generateCustomReport(generateReportDto: GenerateReportDto) {
    // This would implement custom report generation based on the DTO
    // For now, return a placeholder implementation
    return {
      reportType: generateReportDto.reportType,
      filters: generateReportDto.filters,
      dateRange: generateReportDto.dateRange,
      message: 'Custom report generation is not yet implemented',
    };
  }

  private buildDateFilter(dateFrom?: string, dateTo?: string, field = 'createdAt') {
    const filter: any = {};
    if (dateFrom || dateTo) {
      filter[field] = {};
      if (dateFrom) filter[field].gte = new Date(dateFrom);
      if (dateTo) filter[field].lte = new Date(dateTo);
    }
    return filter;
  }
}

// DTOs for Reports
// src/modules/reports/dto/generate-report.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject, IsArray } from 'class-validator';

export class GenerateReportDto {
  @ApiProperty({ example: 'case-summary' })
  @IsNotEmpty()
  @IsString()
  reportType: string;

  @ApiPropertyOptional({ example: { caseId: 'case-id', includeFinancial: true } })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ example: { from: '2024-01-01', to: '2024-12-31' } })
  @IsOptional()
  @IsObject()
  dateRange?: { from: string; to: string };

  @ApiPropertyOptional({ example: ['medical', 'financial', 'tasks'] })
  @IsOptional()
  @IsArray()
  sections?: string[];
}

// src/modules/reports/dto/report-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 'user-uuid-here' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}