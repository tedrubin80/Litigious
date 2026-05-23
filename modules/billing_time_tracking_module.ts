// ============================================================================
// BILLING & TIME TRACKING MODULE - PRISMA MODELS
// ============================================================================

// Add these models to prisma/schema.prisma

model TimeEntry {
  id          String      @id @default(cuid())
  description String
  startTime   DateTime
  endTime     DateTime?
  duration    Int?        // Duration in minutes
  rate        Decimal     // Hourly rate at time of entry
  amount      Decimal     @default(0) // Calculated amount
  status      TimeEntryStatus @default(DRAFT)
  isBillable  Boolean     @default(true)
  isManual    Boolean     @default(false) // Whether manually entered or tracked
  category    String?     // e.g., "Research", "Client Meeting", "Document Review"
  tags        String[]    // Array of tags for categorization
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // Relationships
  userId String
  user   User   @relation(fields: [userId], references: [id])

  caseId String?
  case   Case?   @relation(fields: [caseId], references: [id])

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id])

  // Task association (optional)
  taskId String?
  task   CaseTask? @relation(fields: [taskId], references: [id])

  // Billing
  invoiceLineItemId String?
  invoiceLineItem   InvoiceLineItem? @relation(fields: [invoiceLineItemId], references: [id])

  @@map("time_entries")
}

model BillingRate {
  id          String         @id @default(cuid())
  name        String
  description String?
  rate        Decimal
  type        BillingRateType @default(HOURLY)
  isActive    Boolean        @default(true)
  effectiveDate DateTime     @default(now())
  endDate     DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // User or role-based rates
  userId String?
  user   User?  @relation(fields: [userId], references: [id])
  role   UserRole?

  // Case-specific rates
  caseId String?
  case   Case?   @relation(fields: [caseId], references: [id])

  // Client-specific rates
  clientId String?
  client   Client? @relation(fields: [clientId], references: [id])

  @@map("billing_rates")
}

model Invoice {
  id              String        @id @default(cuid())
  invoiceNumber   String        @unique
  title           String
  description     String?
  issueDate       DateTime      @default(now())
  dueDate         DateTime
  paidDate        DateTime?
  status          InvoiceStatus @default(DRAFT)
  subtotal        Decimal       @default(0)
  taxAmount       Decimal       @default(0)
  discountAmount  Decimal       @default(0)
  totalAmount     Decimal       @default(0)
  paidAmount      Decimal       @default(0)
  balanceAmount   Decimal       @default(0)
  currency        String        @default("USD")
  notes           String?
  terms           String?       // Payment terms
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relationships
  clientId String
  client   Client @relation(fields: [clientId], references: [id])

  caseId String?
  case   Case?   @relation(fields: [caseId], references: [id])

  createdById String
  createdBy   User   @relation(fields: [createdById], references: [id])

  // Invoice components
  lineItems InvoiceLineItem[]
  payments  Payment[]

  @@map("invoices")
}

model InvoiceLineItem {
  id          String           @id @default(cuid())
  description String
  quantity    Decimal          @default(1)
  rate        Decimal
  amount      Decimal
  type        LineItemType     @default(TIME)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  invoiceId String
  invoice   Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  // Time entries associated with this line item
  timeEntries TimeEntry[]

  // Expense items
  expenseId String?
  expense   Expense? @relation(fields: [expenseId], references: [id])

  @@map("invoice_line_items")
}

model Payment {
  id            String        @id @default(cuid())
  amount        Decimal
  method        PaymentMethod
  reference     String?       // Check number, transaction ID, etc.
  notes         String?
  paymentDate   DateTime      @default(now())
  status        PaymentStatus @default(PENDING)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  invoiceId String
  invoice   Invoice @relation(fields: [invoiceId], references: [id])

  processedById String?
  processedBy   User?   @relation(fields: [processedById], references: [id])

  @@map("payments")
}

model Expense {
  id           String        @id @default(cuid())
  description  String
  amount       Decimal
  category     ExpenseCategory
  expenseDate  DateTime      @default(now())
  isBillable   Boolean       @default(true)
  isReimbursed Boolean       @default(false)
  receiptPath  String?       // Path to receipt image/file
  vendor       String?
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  // Relationships
  caseId String?
  case   Case?   @relation(fields: [caseId], references: [id])

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id])

  incurredById String
  incurredBy   User   @relation(fields: [incurredById], references: [id])

  // Billing
  invoiceLineItems InvoiceLineItem[]

  @@map("expenses")
}

model Trust {
  id          String       @id @default(cuid())
  name        String
  description String?
  balance     Decimal      @default(0)
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  clientId String
  client   Client @relation(fields: [clientId], references: [id])

  transactions TrustTransaction[]

  @@map("trusts")
}

model TrustTransaction {
  id            String              @id @default(cuid())
  amount        Decimal
  type          TrustTransactionType
  description   String
  reference     String?
  transactionDate DateTime          @default(now())
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  trustId String
  trust   Trust  @relation(fields: [trustId], references: [id])

  // Related invoice/payment
  invoiceId String?
  invoice   Invoice? @relation(fields: [invoiceId], references: [id])

  paymentId String?
  payment   Payment? @relation(fields: [paymentId], references: [id])

  createdById String
  createdBy   User   @relation(fields: [createdById], references: [id])

  @@map("trust_transactions")
}

model FeeAgreement {
  id           String            @id @default(cuid())
  type         FeeAgreementType
  description  String
  rate         Decimal?          // Hourly rate or percentage
  flatFee      Decimal?          // For flat fee arrangements
  contingency  Decimal?          // Contingency percentage
  retainer     Decimal?          // Retainer amount
  terms        String
  isActive     Boolean           @default(true)
  signedDate   DateTime?
  effectiveDate DateTime         @default(now())
  expirationDate DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  caseId String
  case   Case   @relation(fields: [caseId], references: [id])

  clientId String
  client   Client @relation(fields: [clientId], references: [id])

  @@map("fee_agreements")
}

// Billing Enums
enum TimeEntryStatus {
  DRAFT
  SUBMITTED
  APPROVED
  BILLED
  REJECTED
}

enum BillingRateType {
  HOURLY
  FLAT_FEE
  CONTINGENCY
  BLENDED
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PARTIAL_PAYMENT
  PAID
  OVERDUE
  CANCELLED
  REFUNDED
}

enum LineItemType {
  TIME
  EXPENSE
  FLAT_FEE
  DISCOUNT
  TAX
}

enum PaymentMethod {
  CASH
  CHECK
  CREDIT_CARD
  BANK_TRANSFER
  TRUST_ACCOUNT
  OTHER
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}

enum ExpenseCategory {
  TRAVEL
  MEALS
  FILING_FEES
  EXPERT_WITNESS
  COURT_COSTS
  COPYING
  RESEARCH
  PHONE
  POSTAGE
  SUPPLIES
  OTHER
}

enum TrustTransactionType {
  DEPOSIT
  WITHDRAWAL
  TRANSFER
  INTEREST
  FEE
}

enum FeeAgreementType {
  HOURLY
  FLAT_FEE
  CONTINGENCY
  HYBRID
  RETAINER
}

// Add to existing models:
// Add to User model:
// timeEntries TimeEntry[]
// billingRates BillingRate[]
// createdInvoices Invoice[]
// processedPayments Payment[]
// incurredExpenses Expense[]
// trustTransactions TrustTransaction[]

// Add to Case model:
// timeEntries TimeEntry[]
// billingRates BillingRate[]
// invoices Invoice[]
// expenses Expense[]
// feeAgreements FeeAgreement[]

// Add to Client model:
// timeEntries TimeEntry[]
// billingRates BillingRate[]
// invoices Invoice[]
// expenses Expense[]
// trusts Trust[]
// feeAgreements FeeAgreement[]

// Add to CaseTask model:
// timeEntries TimeEntry[]

// ============================================================================
// BILLING MODULE IMPLEMENTATION
// ============================================================================

// src/modules/billing/billing.module.ts
import { Module } from '@nestjs/common';
import { TimeTrackingController } from './time-tracking.controller';
import { TimeTrackingService } from './time-tracking.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { BillingRatesController } from './billing-rates.controller';
import { BillingRatesService } from './billing-rates.service';
import { TrustController } from './trust.controller';
import { TrustService } from './trust.service';

@Module({
  controllers: [
    TimeTrackingController,
    InvoicesController,
    PaymentsController,
    ExpensesController,
    BillingRatesController,
    TrustController,
  ],
  providers: [
    TimeTrackingService,
    InvoicesService,
    PaymentsService,
    ExpensesService,
    BillingRatesService,
    TrustService,
  ],
  exports: [
    TimeTrackingService,
    InvoicesService,
    PaymentsService,
    ExpensesService,
    BillingRatesService,
    TrustService,
  ],
})
export class BillingModule {}

// src/modules/billing/time-tracking.controller.ts
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
import { TimeTrackingService } from './time-tracking.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { QueryTimeEntriesDto } from './dto/query-time-entries.dto';
import { StartTimerDto } from './dto/start-timer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Time Tracking')
@Controller('billing/time')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get()
  @ApiOperation({ summary: 'Get time entries' })
  @ApiResponse({ status: 200, description: 'Time entries retrieved successfully' })
  getTimeEntries(@Query() queryDto: QueryTimeEntriesDto, @Request() req) {
    return this.timeTrackingService.getTimeEntries(queryDto, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create time entry' })
  @ApiResponse({ status: 201, description: 'Time entry created successfully' })
  createTimeEntry(@Body() createTimeEntryDto: CreateTimeEntryDto, @Request() req) {
    return this.timeTrackingService.createTimeEntry(createTimeEntryDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get time entry by ID' })
  @ApiResponse({ status: 200, description: 'Time entry retrieved successfully' })
  getTimeEntry(@Param('id') id: string, @Request() req) {
    return this.timeTrackingService.getTimeEntry(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update time entry' })
  @ApiResponse({ status: 200, description: 'Time entry updated successfully' })
  updateTimeEntry(
    @Param('id') id: string,
    @Body() updateTimeEntryDto: UpdateTimeEntryDto,
    @Request() req,
  ) {
    return this.timeTrackingService.updateTimeEntry(id, updateTimeEntryDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete time entry' })
  @ApiResponse({ status: 200, description: 'Time entry deleted successfully' })
  deleteTimeEntry(@Param('id') id: string, @Request() req) {
    return this.timeTrackingService.deleteTimeEntry(id, req.user.id);
  }

  // Timer functionality
  @Post('timer/start')
  @ApiOperation({ summary: 'Start time tracking timer' })
  @ApiResponse({ status: 201, description: 'Timer started successfully' })
  startTimer(@Body() startTimerDto: StartTimerDto, @Request() req) {
    return this.timeTrackingService.startTimer(startTimerDto, req.user.id);
  }

  @Post('timer/:id/stop')
  @ApiOperation({ summary: 'Stop time tracking timer' })
  @ApiResponse({ status: 200, description: 'Timer stopped successfully' })
  stopTimer(@Param('id') id: string, @Request() req) {
    return this.timeTrackingService.stopTimer(id, req.user.id);
  }

  @Get('timer/active')
  @ApiOperation({ summary: 'Get active timer for user' })
  @ApiResponse({ status: 200, description: 'Active timer retrieved successfully' })
  getActiveTimer(@Request() req) {
    return this.timeTrackingService.getActiveTimer(req.user.id);
  }

  // Time tracking analytics
  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get time tracking summary' })
  @ApiResponse({ status: 200, description: 'Time tracking summary retrieved successfully' })
  getTimeTrackingSummary(@Query() query: any, @Request() req) {
    return this.timeTrackingService.getTimeTrackingSummary(query, req.user.id);
  }

  // Bulk operations
  @Patch('bulk/approve')
  @ApiOperation({ summary: 'Approve multiple time entries' })
  @ApiResponse({ status: 200, description: 'Time entries approved successfully' })
  approveTimeEntries(@Body() body: { timeEntryIds: string[] }, @Request() req) {
    return this.timeTrackingService.approveTimeEntries(body.timeEntryIds, req.user.id);
  }

  @Patch('bulk/submit')
  @ApiOperation({ summary: 'Submit multiple time entries for approval' })
  @ApiResponse({ status: 200, description: 'Time entries submitted successfully' })
  submitTimeEntries(@Body() body: { timeEntryIds: string[] }, @Request() req) {
    return this.timeTrackingService.submitTimeEntries(body.timeEntryIds, req.user.id);
  }
}

// src/modules/billing/time-tracking.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { QueryTimeEntriesDto } from './dto/query-time-entries.dto';
import { StartTimerDto } from './dto/start-timer.dto';

@Injectable()
export class TimeTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async getTimeEntries(queryDto: QueryTimeEntriesDto, userId: string) {
    const {
      caseId,
      clientId,
      status,
      isBillable,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (caseId) where.caseId = caseId;
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (isBillable !== undefined) where.isBillable = isBillable;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const [timeEntries, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where,
        skip,
        take: limit,
        include: {
          case: {
            select: { id: true, caseNumber: true, title: true },
          },
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
          task: {
            select: { id: true, title: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
    const totalAmount = timeEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);

    return {
      data: timeEntries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalHours: Math.round(totalHours * 100) / 100,
        totalAmount,
      },
    };
  }

  async createTimeEntry(createTimeEntryDto: CreateTimeEntryDto, userId: string) {
    const { startTime, endTime, duration, ...entryData } = createTimeEntryDto;

    // Calculate duration if not provided
    let calculatedDuration = duration;
    if (!calculatedDuration && startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    }

    // Get billing rate for user
    const rate = await this.getBillingRate(userId, entryData.caseId, entryData.clientId);
    const amount = calculatedDuration ? (calculatedDuration / 60) * Number(rate) : 0;

    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        ...entryData,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration: calculatedDuration,
        rate,
        amount,
        userId,
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        task: {
          select: { id: true, title: true },
        },
      },
    });

    return timeEntry;
  }

  async getTimeEntry(id: string, userId: string) {
    const timeEntry = await this.prisma.timeEntry.findFirst({
      where: { id, userId },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        task: {
          select: { id: true, title: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    return timeEntry;
  }

  async updateTimeEntry(id: string, updateTimeEntryDto: UpdateTimeEntryDto, userId: string) {
    const timeEntry = await this.getTimeEntry(id, userId);

    if (timeEntry.status === 'BILLED') {
      throw new ForbiddenException('Cannot update billed time entry');
    }

    const { startTime, endTime, duration, ...updateData } = updateTimeEntryDto;

    // Recalculate duration and amount if time changed
    let updatedDuration = duration;
    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : timeEntry.startTime;
      const end = endTime ? new Date(endTime) : timeEntry.endTime;
      if (start && end) {
        updatedDuration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
      }
    }

    let updatedAmount = timeEntry.amount;
    if (updatedDuration !== timeEntry.duration) {
      updatedAmount = updatedDuration ? (updatedDuration / 60) * Number(timeEntry.rate) : 0;
    }

    const updatedTimeEntry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        ...updateData,
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(updatedDuration !== undefined && { 
          duration: updatedDuration,
          amount: updatedAmount,
        }),
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        task: {
          select: { id: true, title: true },
        },
      },
    });

    return updatedTimeEntry;
  }

  async deleteTimeEntry(id: string, userId: string) {
    const timeEntry = await this.getTimeEntry(id, userId);

    if (timeEntry.status === 'BILLED') {
      throw new ForbiddenException('Cannot delete billed time entry');
    }

    await this.prisma.timeEntry.delete({
      where: { id },
    });

    return { message: 'Time entry deleted successfully' };
  }

  async startTimer(startTimerDto: StartTimerDto, userId: string) {
    // Check if user has an active timer
    const activeTimer = await this.prisma.timeEntry.findFirst({
      where: {
        userId,
        status: 'DRAFT',
        endTime: null,
      },
    });

    if (activeTimer) {
      throw new ForbiddenException('You already have an active timer running');
    }

    const rate = await this.getBillingRate(userId, startTimerDto.caseId, startTimerDto.clientId);

    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        ...startTimerDto,
        startTime: new Date(),
        rate,
        userId,
        isManual: false,
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        task: {
          select: { id: true, title: true },
        },
      },
    });

    return timeEntry;
  }

  async stopTimer(id: string, userId: string) {
    const timeEntry = await this.getTimeEntry(id, userId);

    if (timeEntry.endTime) {
      throw new ForbiddenException('Timer is already stopped');
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - timeEntry.startTime.getTime()) / (1000 * 60));
    const amount = (duration / 60) * Number(timeEntry.rate);

    const updatedTimeEntry = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        endTime,
        duration,
        amount,
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        task: {
          select: { id: true, title: true },
        },
      },
    });

    return updatedTimeEntry;
  }

  async getActiveTimer(userId: string) {
    const activeTimer = await this.prisma.timeEntry.findFirst({
      where: {
        userId,
        status: 'DRAFT',
        endTime: null,
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        task: {
          select: { id: true, title: true },
        },
      },
    });

    return activeTimer;
  }

  async getTimeTrackingSummary(query: any, userId: string) {
    const { startDate, endDate, caseId, clientId } = query;

    const where: any = { userId };
    if (caseId) where.caseId = caseId;
    if (clientId) where.clientId = clientId;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const [
      totalEntries,
      billableTime,
      nonBillableTime,
      totalAmount,
      timeByStatus,
      timeByCase,
    ] = await Promise.all([
      this.prisma.timeEntry.count({ where }),
      this.prisma.timeEntry.aggregate({
        where: { ...where, isBillable: true },
        _sum: { duration: true, amount: true },
      }),
      this.prisma.timeEntry.aggregate({
        where: { ...where, isBillable: false },
        _sum: { duration: true },
      }),
      this.prisma.timeEntry.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.timeEntry.groupBy({
        by: ['status'],
        where,
        _sum: { duration: true, amount: true },
        _count: true,
      }),
      this.prisma.timeEntry.groupBy({
        by: ['caseId'],
        where: { ...where, caseId: { not: null } },
        _sum: { duration: true, amount: true },
        _count: true,
      }),
    ]);

    return {
      summary: {
        totalEntries,
        totalHours: Math.round(((billableTime._sum.duration || 0) + (nonBillableTime._sum.duration || 0)) / 60 * 100) / 100,
        billableHours: Math.round((billableTime._sum.duration || 0) / 60 * 100) / 100,
        nonBillableHours: Math.round((nonBillableTime._sum.duration || 0) / 60 * 100) / 100,
        totalAmount: totalAmount._sum.amount || 0,
        billableAmount: billableTime._sum.amount || 0,
      },
      timeByStatus: timeByStatus.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = {
          count: item._count,
          hours: Math.round((item._sum.duration || 0) / 60 * 100) / 100,
          amount: item._sum.amount || 0,
        };
        return acc;
      }, {}),
      timeByCase: timeByCase.map(item => ({
        caseId: item.caseId,
        count: item._count,
        hours: Math.round((item._sum.duration || 0) / 60 * 100) / 100,
        amount: item._sum.amount || 0,
      })),
    };
  }

  async approveTimeEntries(timeEntryIds: string[], userId: string) {
    // Check if user has permission to approve (admin/attorney role check would go here)
    
    const updatedEntries = await this.prisma.timeEntry.updateMany({
      where: {
        id: { in: timeEntryIds },
        status: 'SUBMITTED',
      },
      data: {
        status: 'APPROVED',
      },
    });

    return {
      message: `${updatedEntries.count} time entries approved successfully`,
      approvedCount: updatedEntries.count,
    };
  }

  async submitTimeEntries(timeEntryIds: string[], userId: string) {
    const updatedEntries = await this.prisma.timeEntry.updateMany({
      where: {
        id: { in: timeEntryIds },
        userId,
        status: 'DRAFT',
      },
      data: {
        status: 'SUBMITTED',
      },
    });

    return {
      message: `${updatedEntries.count} time entries submitted for approval`,
      submittedCount: updatedEntries.count,
    };
  }

  private async getBillingRate(userId: string, caseId?: string, clientId?: string): Promise<number> {
    // Priority order: case-specific > client-specific > user-specific > role-specific > default
    const ratePriorities = [
      { caseId, userId },
      { clientId, userId },
      { userId },
      // Add role-based rate lookup here if needed
    ].filter(criteria => Object.values(criteria).some(v => v));

    for (const criteria of ratePriorities) {
      const rate = await this.prisma.billingRate.findFirst({
        where: {
          ...criteria,
          isActive: true,
          effectiveDate: { lte: new Date() },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
        orderBy: { effectiveDate: 'desc' },
      });

      if (rate) {
        return Number(rate.rate);
      }
    }

    // Default rate if no specific rate found
    return 250; // $250/hour default
  }
}

// ============================================================================
// DTOs FOR TIME TRACKING
// ============================================================================

// src/modules/billing/dto/create-time-entry.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
  IsUUID,
  IsArray,
  Min,
} from 'class-validator';

export class CreateTimeEntryDto {
  @ApiProperty({ example: 'Reviewed medical records and prepared summary' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ example: '2024-01-15T11:30:00Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number; // minutes

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean = true;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isManual?: boolean = true;

  @ApiPropertyOptional({ example: 'Document Review' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: ['medical', 'review', 'urgent'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'case-uuid-here' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional({ example: 'client-uuid-here' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ example: 'task-uuid-here' })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}

// src/modules/billing/dto/update-time-entry.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateTimeEntryDto } from './create-time-entry.dto';

export class UpdateTimeEntryDto extends PartialType(CreateTimeEntryDto) {}

// src/modules/billing/dto/query-time-entries.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TimeEntryStatus } from '@prisma/client';

export class QueryTimeEntriesDto {
  @ApiPropertyOptional({ example: 'case-uuid-here' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional({ example: 'client-uuid-here' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ enum: TimeEntryStatus })
  @IsOptional()
  @IsEnum(TimeEntryStatus)
  status?: TimeEntryStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-01-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

// src/modules/billing/dto/start-timer.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
} from 'class-validator';

export class StartTimerDto {
  @ApiProperty({ example: 'Client consultation call' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean = true;

  @ApiPropertyOptional({ example: 'Client Meeting' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: ['consultation', 'urgent'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'case-uuid-here' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional({ example: 'client-uuid-here' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ example: 'task-uuid-here' })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}