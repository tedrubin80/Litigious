const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const smartTimeTracking = require('./SmartTimeTrackingService');

class AutomatedBillingService {
  constructor() {
    this.prisma = new PrismaClient();
    
    // Invoice statuses
    this.INVOICE_STATUSES = {
      DRAFT: 'DRAFT',
      PENDING: 'PENDING',
      SENT: 'SENT',
      PAID: 'PAID',
      OVERDUE: 'OVERDUE',
      DISPUTED: 'DISPUTED',
      CANCELLED: 'CANCELLED',
      PARTIAL: 'PARTIAL'
    };

    // Payment methods
    this.PAYMENT_METHODS = {
      CREDIT_CARD: 'CREDIT_CARD',
      ACH: 'ACH',
      WIRE: 'WIRE',
      CHECK: 'CHECK',
      TRUST_ACCOUNT: 'TRUST_ACCOUNT'
    };

    // Billing frequencies
    this.BILLING_FREQUENCIES = {
      WEEKLY: 'WEEKLY',
      BIWEEKLY: 'BIWEEKLY',
      MONTHLY: 'MONTHLY',
      QUARTERLY: 'QUARTERLY',
      PROJECT_BASED: 'PROJECT_BASED',
      RETAINER: 'RETAINER'
    };

    // Fee types
    this.FEE_TYPES = {
      HOURLY: 'HOURLY',
      FLAT: 'FLAT',
      CONTINGENCY: 'CONTINGENCY',
      RETAINER: 'RETAINER',
      EXPENSE: 'EXPENSE',
      COURT_COST: 'COURT_COST'
    };
  }

  /**
   * Generate automated invoice from time entries
   */
  async generateInvoice(clientId, caseId = null, options = {}) {
    try {
      const {
        startDate,
        endDate,
        includeExpenses = true,
        billingTemplate = 'STANDARD',
        notes = '',
        dueDate = null
      } = options;

      // Get unbilled time entries
      const timeEntries = await this.prisma.timeEntry.findMany({
        where: {
          clientId: clientId,
          caseId: caseId || undefined,
          status: 'COMPLETED',
          invoiceId: null,
          startTime: startDate ? { gte: new Date(startDate) } : undefined,
          endTime: endDate ? { lte: new Date(endDate) } : undefined
        },
        include: {
          user: { select: { name: true, hourlyRate: true } },
          case: { select: { title: true, caseNumber: true } }
        },
        orderBy: { startTime: 'asc' }
      });

      if (timeEntries.length === 0) {
        throw new Error('No unbilled time entries found for the specified criteria');
      }

      // Get client information
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        include: {
          cases: {
            where: caseId ? { id: caseId } : undefined,
            select: { title: true, caseNumber: true, caseType: true }
          }
        }
      });

      // Calculate invoice totals
      const lineItems = await this.generateLineItems(timeEntries, includeExpenses);
      const totals = this.calculateInvoiceTotals(lineItems);

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create invoice
      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber: invoiceNumber,
          clientId: clientId,
          caseId: caseId,
          status: this.INVOICE_STATUSES.DRAFT,
          issueDate: new Date(),
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
          subtotal: totals.subtotal,
          taxAmount: totals.tax,
          totalAmount: totals.total,
          notes: notes,
          metadata: {
            billingTemplate: billingTemplate,
            generatedDate: new Date().toISOString(),
            timeEntriesCount: timeEntries.length,
            billingPeriod: {
              start: startDate,
              end: endDate
            }
          }
        }
      });

      // Create invoice line items
      for (const item of lineItems) {
        await this.prisma.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            type: item.type,
            metadata: item.metadata
          }
        });
      }

      // Update time entries with invoice reference
      await this.prisma.timeEntry.updateMany({
        where: {
          id: { in: timeEntries.map(entry => entry.id) }
        },
        data: {
          invoiceId: invoice.id,
          status: 'BILLED'
        }
      });

      return {
        success: true,
        invoice: invoice,
        lineItems: lineItems,
        totals: totals,
        timeEntriesCount: timeEntries.length
      };

    } catch (error) {
      console.error('Generate invoice error:', error);
      throw new Error(`Failed to generate invoice: ${error.message}`);
    }
  }

  /**
   * Generate line items from time entries and expenses
   */
  async generateLineItems(timeEntries, includeExpenses = true) {
    const lineItems = [];

    // Group time entries by activity type and date for better organization
    const groupedEntries = {};
    
    timeEntries.forEach(entry => {
      const date = entry.startTime.toISOString().split('T')[0];
      const activity = entry.metadata?.activityType || 'Legal Services';
      const key = `${date}-${activity}`;
      
      if (!groupedEntries[key]) {
        groupedEntries[key] = {
          date: date,
          activity: activity,
          entries: [],
          totalMinutes: 0,
          totalAmount: 0
        };
      }
      
      groupedEntries[key].entries.push(entry);
      groupedEntries[key].totalMinutes += entry.duration || 0;
      groupedEntries[key].totalAmount += entry.billableAmount || 0;
    });

    // Create line items from grouped entries
    Object.values(groupedEntries).forEach(group => {
      const hours = group.totalMinutes / 60;
      const avgRate = group.totalAmount / hours;

      // Create detailed description
      const descriptions = group.entries.map(entry => entry.description).slice(0, 3);
      let description = `${group.date} - ${group.activity}: ${descriptions.join('; ')}`;
      if (group.entries.length > 3) {
        description += ` (and ${group.entries.length - 3} more tasks)`;
      }

      lineItems.push({
        type: this.FEE_TYPES.HOURLY,
        description: description,
        quantity: Math.round(hours * 100) / 100, // Round to 2 decimals
        rate: Math.round(avgRate * 100) / 100,
        amount: Math.round(group.totalAmount * 100) / 100,
        metadata: {
          activityType: group.activity,
          timeEntryIds: group.entries.map(e => e.id),
          date: group.date
        }
      });
    });

    // Add expenses if requested
    if (includeExpenses) {
      // Get unbilled expenses (placeholder - implement expense tracking)
      const expenses = await this.getUnbilledExpenses(timeEntries[0]?.clientId, timeEntries[0]?.caseId);
      
      expenses.forEach(expense => {
        lineItems.push({
          type: this.FEE_TYPES.EXPENSE,
          description: expense.description,
          quantity: 1,
          rate: expense.amount,
          amount: expense.amount,
          metadata: {
            expenseId: expense.id,
            category: expense.category
          }
        });
      });
    }

    return lineItems;
  }

  /**
   * Calculate invoice totals including taxes
   */
  calculateInvoiceTotals(lineItems) {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = 0.08; // 8% tax rate - should be configurable
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Process payment through Stripe
   */
  async processPayment(invoiceId, paymentMethodId, amount) {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { client: true }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_method: paymentMethodId,
        customer: invoice.client.stripeCustomerId,
        confirm: true,
        metadata: {
          invoiceId: invoiceId,
          clientId: invoice.clientId,
          invoiceNumber: invoice.invoiceNumber
        }
      });

      // Record payment
      const payment = await this.prisma.payment.create({
        data: {
          invoiceId: invoiceId,
          amount: amount,
          paymentMethod: this.PAYMENT_METHODS.CREDIT_CARD,
          stripePaymentIntentId: paymentIntent.id,
          status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
          processedAt: new Date(),
          metadata: {
            stripePaymentIntent: paymentIntent.id,
            paymentMethod: paymentMethodId
          }
        }
      });

      // Update invoice status
      const newStatus = amount >= invoice.totalAmount ? 
        this.INVOICE_STATUSES.PAID : 
        this.INVOICE_STATUSES.PARTIAL;

      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          paidAmount: (invoice.paidAmount || 0) + amount,
          lastPaymentDate: new Date()
        }
      });

      return {
        success: true,
        payment: payment,
        paymentIntent: paymentIntent,
        invoiceStatus: newStatus
      };

    } catch (error) {
      console.error('Process payment error:', error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Generate automated payment reminders
   */
  async generatePaymentReminders() {
    try {
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          status: { in: [this.INVOICE_STATUSES.SENT, this.INVOICE_STATUSES.OVERDUE] },
          dueDate: { lt: new Date() },
          totalAmount: { gt: 0 }
        },
        include: {
          client: true,
          case: { select: { title: true, caseNumber: true } }
        }
      });

      const reminders = [];

      for (const invoice of overdueInvoices) {
        const daysPastDue = Math.floor(
          (new Date() - invoice.dueDate) / (1000 * 60 * 60 * 24)
        );

        // Determine reminder type based on days past due
        let reminderType = 'GENTLE';
        if (daysPastDue > 30) reminderType = 'FIRM';
        if (daysPastDue > 60) reminderType = 'FINAL';

        const reminder = await this.createPaymentReminder(invoice, reminderType, daysPastDue);
        reminders.push(reminder);

        // Update invoice status to overdue
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: this.INVOICE_STATUSES.OVERDUE }
        });
      }

      return {
        success: true,
        reminders: reminders,
        count: reminders.length
      };

    } catch (error) {
      console.error('Generate payment reminders error:', error);
      throw new Error(`Failed to generate payment reminders: ${error.message}`);
    }
  }

  /**
   * Setup automated billing schedule
   */
  async setupBillingSchedule(clientId, schedule) {
    try {
      const {
        frequency,
        dayOfMonth = 1,
        includePendingTime = true,
        includeExpenses = true,
        autoSend = false,
        billingTemplate = 'STANDARD'
      } = schedule;

      const billingSchedule = await this.prisma.billingSchedule.create({
        data: {
          clientId: clientId,
          frequency: frequency,
          dayOfMonth: dayOfMonth,
          isActive: true,
          settings: {
            includePendingTime: includePendingTime,
            includeExpenses: includeExpenses,
            autoSend: autoSend,
            billingTemplate: billingTemplate,
            createdAt: new Date().toISOString()
          },
          nextBillingDate: this.calculateNextBillingDate(frequency, dayOfMonth)
        }
      });

      return {
        success: true,
        billingSchedule: billingSchedule
      };

    } catch (error) {
      console.error('Setup billing schedule error:', error);
      throw new Error(`Failed to setup billing schedule: ${error.message}`);
    }
  }

  /**
   * Run automated billing for all active schedules
   */
  async runAutomatedBilling() {
    try {
      const dueSchedules = await this.prisma.billingSchedule.findMany({
        where: {
          isActive: true,
          nextBillingDate: { lte: new Date() }
        },
        include: { client: true }
      });

      const results = [];

      for (const schedule of dueSchedules) {
        try {
          // Generate invoice for this schedule
          const invoiceResult = await this.generateInvoice(
            schedule.clientId,
            null, // All cases for this client
            {
              includeExpenses: schedule.settings?.includeExpenses || true,
              billingTemplate: schedule.settings?.billingTemplate || 'STANDARD',
              notes: `Automated billing - ${schedule.frequency}`
            }
          );

          // Auto-send if configured
          if (schedule.settings?.autoSend && invoiceResult.success) {
            await this.sendInvoice(invoiceResult.invoice.id);
          }

          // Update next billing date
          await this.prisma.billingSchedule.update({
            where: { id: schedule.id },
            data: {
              nextBillingDate: this.calculateNextBillingDate(
                schedule.frequency,
                schedule.dayOfMonth
              ),
              lastBillingDate: new Date()
            }
          });

          results.push({
            scheduleId: schedule.id,
            clientId: schedule.clientId,
            success: true,
            invoice: invoiceResult.invoice
          });

        } catch (error) {
          results.push({
            scheduleId: schedule.id,
            clientId: schedule.clientId,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        processedSchedules: results,
        totalProcessed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };

    } catch (error) {
      console.error('Run automated billing error:', error);
      throw new Error(`Automated billing failed: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */

  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: `INV-${year}${month}` }
      },
      orderBy: { createdAt: 'desc' }
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  calculateNextBillingDate(frequency, dayOfMonth) {
    const today = new Date();
    let nextDate = new Date(today);

    switch (frequency) {
      case this.BILLING_FREQUENCIES.WEEKLY:
        nextDate.setDate(today.getDate() + 7);
        break;
      case this.BILLING_FREQUENCIES.BIWEEKLY:
        nextDate.setDate(today.getDate() + 14);
        break;
      case this.BILLING_FREQUENCIES.MONTHLY:
        nextDate.setMonth(today.getMonth() + 1);
        nextDate.setDate(dayOfMonth);
        break;
      case this.BILLING_FREQUENCIES.QUARTERLY:
        nextDate.setMonth(today.getMonth() + 3);
        nextDate.setDate(dayOfMonth);
        break;
      default:
        nextDate.setDate(today.getDate() + 30);
    }

    return nextDate;
  }

  async getUnbilledExpenses(clientId, caseId) {
    // Placeholder - implement expense tracking
    return [];
  }

  async createPaymentReminder(invoice, reminderType, daysPastDue) {
    // Create payment reminder record and potentially send email
    return {
      invoiceId: invoice.id,
      reminderType: reminderType,
      daysPastDue: daysPastDue,
      sentAt: new Date()
    };
  }

  async sendInvoice(invoiceId) {
    // Implementation for sending invoice via email
    console.log(`Sending invoice ${invoiceId}`);
    
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: this.INVOICE_STATUSES.SENT,
        sentAt: new Date()
      }
    });
  }

  /**
   * Generate billing analytics
   */
  async getBillingAnalytics(startDate, endDate) {
    try {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          issueDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        include: {
          client: { select: { firstName: true, lastName: true } },
          payments: true
        }
      });

      const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const outstandingAmount = totalInvoiced - totalPaid;

      const statusBreakdown = {};
      invoices.forEach(invoice => {
        statusBreakdown[invoice.status] = (statusBreakdown[invoice.status] || 0) + 1;
      });

      return {
        summary: {
          totalInvoiced: totalInvoiced,
          totalPaid: totalPaid,
          outstandingAmount: outstandingAmount,
          collectionRate: totalInvoiced > 0 ? (totalPaid / totalInvoiced * 100) : 0,
          invoiceCount: invoices.length
        },
        statusBreakdown: statusBreakdown,
        monthlyTrend: this.calculateMonthlyTrend(invoices)
      };

    } catch (error) {
      console.error('Billing analytics error:', error);
      throw new Error(`Failed to get billing analytics: ${error.message}`);
    }
  }

  calculateMonthlyTrend(invoices) {
    const monthlyData = {};
    
    invoices.forEach(invoice => {
      const month = invoice.issueDate.toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          invoiced: 0,
          paid: 0,
          count: 0
        };
      }
      
      monthlyData[month].invoiced += invoice.totalAmount;
      monthlyData[month].paid += invoice.paidAmount || 0;
      monthlyData[month].count += 1;
    });

    return Object.keys(monthlyData)
      .sort()
      .map(month => ({
        month: month,
        ...monthlyData[month]
      }));
  }
}

// Export singleton instance
module.exports = new AutomatedBillingService();