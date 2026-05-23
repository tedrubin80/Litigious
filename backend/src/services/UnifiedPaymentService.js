const axios = require('axios');

// Initialize payment processors with graceful handling for missing API keys
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const paypal = require('@paypal/checkout-server-sdk');

let SquareClient = null;
let SquareEnvironment = null;
try {
  const squareSDK = require('squareup');
  SquareClient = squareSDK.Client;
  SquareEnvironment = squareSDK.Environment;
} catch (error) {
  console.warn('Square SDK not available:', error.message);
}

// Buy Now Pay Later providers
const klarnaApi = axios.create({
  baseURL: process.env.KLARNA_ENVIRONMENT === 'production' ? 'https://api.klarna.com' : 'https://api.playground.klarna.com',
  headers: { 'Content-Type': 'application/json' },
  auth: {
    username: process.env.KLARNA_USERNAME,
    password: process.env.KLARNA_PASSWORD
  }
});

const affirmApi = axios.create({
  baseURL: process.env.AFFIRM_ENVIRONMENT === 'production' ? 'https://api.affirm.com' : 'https://sandbox.affirm.com',
  headers: { 'Content-Type': 'application/json' },
  auth: {
    username: process.env.AFFIRM_PUBLIC_KEY,
    password: process.env.AFFIRM_PRIVATE_KEY
  }
});

class UnifiedPaymentService {
  constructor() {
    // Initialize payment processors
    this.initializeStripe();
    this.initializePayPal();
    this.initializeSquare();
    this.initializeKlarna();
    this.initializeAffirm();
    
    this.PAYMENT_PROCESSORS = {
      STRIPE: 'STRIPE',
      PAYPAL: 'PAYPAL',
      SQUARE: 'SQUARE',
      KLARNA: 'KLARNA',
      AFFIRM: 'AFFIRM'
    };

    this.PAYMENT_STATUSES = {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
      REFUNDED: 'REFUNDED',
      PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED'
    };

    this.PAYMENT_METHODS = {
      CREDIT_CARD: 'CREDIT_CARD',
      DEBIT_CARD: 'DEBIT_CARD',
      ACH: 'ACH',
      PAYPAL: 'PAYPAL',
      APPLE_PAY: 'APPLE_PAY',
      GOOGLE_PAY: 'GOOGLE_PAY',
      CASH_APP: 'CASH_APP',
      KLARNA_PAY_NOW: 'KLARNA_PAY_NOW',
      KLARNA_PAY_LATER: 'KLARNA_PAY_LATER',
      KLARNA_SLICE_IT: 'KLARNA_SLICE_IT',
      AFFIRM_INSTALLMENTS: 'AFFIRM_INSTALLMENTS'
    };
  }

  /**
   * Initialize Stripe
   */
  initializeStripe() {
    try {
      if (stripe) {
        this.stripe = stripe;
        console.log('✅ Stripe payment processor initialized');
      } else {
        console.warn('⚠️ Stripe API key not configured - Stripe payments disabled');
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
    }
  }

  /**
   * Initialize PayPal
   */
  initializePayPal() {
    try {
      if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
        const environment = process.env.PAYPAL_ENVIRONMENT === 'production' 
          ? new paypal.core.LiveEnvironment(
              process.env.PAYPAL_CLIENT_ID,
              process.env.PAYPAL_CLIENT_SECRET
            )
          : new paypal.core.SandboxEnvironment(
              process.env.PAYPAL_CLIENT_ID,
              process.env.PAYPAL_CLIENT_SECRET
            );

        this.paypalClient = new paypal.core.PayPalHttpClient(environment);
        console.log('✅ PayPal payment processor initialized');
      } else {
        console.warn('⚠️ PayPal API credentials not configured - PayPal payments disabled');
      }
    } catch (error) {
      console.error('Failed to initialize PayPal:', error);
    }
  }

  /**
   * Initialize Square
   */
  initializeSquare() {
    try {
      if (SquareClient && SquareEnvironment && process.env.SQUARE_ACCESS_TOKEN) {
        const environment = process.env.SQUARE_ENVIRONMENT === 'production'
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox;

        this.squareClient = new SquareClient({
          environment: environment,
          accessToken: process.env.SQUARE_ACCESS_TOKEN
        });
        console.log('✅ Square payment processor initialized');
      } else {
        console.warn('⚠️ Square SDK or API credentials not configured - Square payments disabled');
      }
    } catch (error) {
      console.error('Failed to initialize Square:', error);
    }
  }

  /**
   * Initialize Klarna
   */
  initializeKlarna() {
    try {
      this.klarnaApi = klarnaApi;
      console.log('✅ Klarna BNPL payment processor initialized');
    } catch (error) {
      console.error('Failed to initialize Klarna:', error);
    }
  }

  /**
   * Initialize Affirm
   */
  initializeAffirm() {
    try {
      this.affirmApi = affirmApi;
      console.log('✅ Affirm BNPL payment processor initialized');
    } catch (error) {
      console.error('Failed to initialize Affirm:', error);
    }
  }

  /**
   * Process payment through specified processor
   */
  async processPayment(paymentData) {
    const {
      processor = 'STRIPE',
      amount,
      currency = 'USD',
      paymentMethod,
      customer,
      invoice,
      metadata = {}
    } = paymentData;

    try {
      let result;

      switch (processor.toUpperCase()) {
        case this.PAYMENT_PROCESSORS.STRIPE:
          result = await this.processStripePayment(paymentData);
          break;
        case this.PAYMENT_PROCESSORS.PAYPAL:
          result = await this.processPayPalPayment(paymentData);
          break;
        case this.PAYMENT_PROCESSORS.SQUARE:
          result = await this.processSquarePayment(paymentData);
          break;
        case this.PAYMENT_PROCESSORS.KLARNA:
          result = await this.processKlarnaPayment(paymentData);
          break;
        case this.PAYMENT_PROCESSORS.AFFIRM:
          result = await this.processAffirmPayment(paymentData);
          break;
        default:
          throw new Error(`Unsupported payment processor: ${processor}`);
      }

      return {
        success: true,
        processor: processor,
        ...result
      };

    } catch (error) {
      console.error(`Payment processing error (${processor}):`, error);
      return {
        success: false,
        processor: processor,
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Stripe Payment Processing
   */
  async processStripePayment(paymentData) {
    const { amount, currency, paymentMethod, customer, invoice, metadata } = paymentData;

    try {
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        payment_method: paymentMethod.id,
        customer: customer.stripeCustomerId,
        confirm: true,
        metadata: {
          invoiceId: invoice?.id,
          clientId: customer.id,
          ...metadata
        },
        receipt_email: customer.email,
        description: `Legal Services Invoice ${invoice?.invoiceNumber || ''}`
      });

      return {
        paymentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        transactionId: paymentIntent.id,
        fees: this.calculateStripeFeesDetail(amount),
        rawResponse: paymentIntent
      };

    } catch (error) {
      throw new Error(`Stripe payment failed: ${error.message}`);
    }
  }

  /**
   * PayPal Payment Processing
   */
  async processPayPalPayment(paymentData) {
    const { amount, currency, customer, invoice, metadata } = paymentData;

    try {
      // Create PayPal order
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: invoice?.invoiceNumber || `INV-${Date.now()}`,
          amount: {
            currency_code: currency,
            value: amount.toFixed(2)
          },
          description: `Legal Services Invoice ${invoice?.invoiceNumber || ''}`,
          invoice_id: invoice?.id,
          custom_id: customer.id
        }],
        payer: {
          name: {
            given_name: customer.firstName,
            surname: customer.lastName
          },
          email_address: customer.email
        },
        application_context: {
          brand_name: 'LegalEstate',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: `${process.env.BASE_URL}/payment/success`,
          cancel_url: `${process.env.BASE_URL}/payment/cancel`
        }
      });

      const order = await this.paypalClient.execute(request);

      // For server-side processing, we need to capture the payment
      if (paymentData.captureImmediately) {
        const captureRequest = new paypal.orders.OrdersCaptureRequest(order.result.id);
        const capture = await this.paypalClient.execute(captureRequest);

        return {
          paymentId: capture.result.id,
          orderId: order.result.id,
          status: this.mapPayPalStatus(capture.result.status),
          transactionId: capture.result.purchase_units[0].payments.captures[0].id,
          fees: this.calculatePayPalFees(amount),
          approvalUrl: null, // Already captured
          rawResponse: capture.result
        };
      } else {
        // Return approval URL for client-side completion
        const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;

        return {
          paymentId: order.result.id,
          orderId: order.result.id,
          status: this.PAYMENT_STATUSES.PENDING,
          approvalUrl: approvalUrl,
          rawResponse: order.result
        };
      }

    } catch (error) {
      throw new Error(`PayPal payment failed: ${error.message}`);
    }
  }

  /**
   * Square Payment Processing
   */
  async processSquarePayment(paymentData) {
    const { amount, currency, paymentMethod, customer, invoice, metadata } = paymentData;

    try {
      const paymentsApi = this.squareClient.paymentsApi;

      const requestBody = {
        source_id: paymentMethod.nonce, // Square nonce from frontend
        amount_money: {
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency
        },
        idempotency_key: `${invoice?.id || 'payment'}-${Date.now()}`,
        reference_id: invoice?.invoiceNumber,
        note: `Legal Services Invoice ${invoice?.invoiceNumber || ''}`,
        buyer_email_address: customer.email,
        billing_address: paymentMethod.billingAddress,
        shipping_address: paymentMethod.shippingAddress
      };

      const response = await paymentsApi.createPayment(requestBody);

      return {
        paymentId: response.result.payment.id,
        status: this.mapSquareStatus(response.result.payment.status),
        transactionId: response.result.payment.id,
        fees: this.calculateSquareFees(amount),
        rawResponse: response.result
      };

    } catch (error) {
      throw new Error(`Square payment failed: ${error.message}`);
    }
  }

  /**
   * Klarna BNPL Payment Processing
   */
  async processKlarnaPayment(paymentData) {
    const { amount, currency, paymentMethod, customer, invoice, metadata } = paymentData;

    try {
      // Create Klarna payment session
      const sessionData = {
        purchase_amount: Math.round(amount * 100), // Convert to minor units
        purchase_currency: currency,
        locale: customer.locale || 'en-US',
        order_amount: Math.round(amount * 100),
        order_tax_amount: 0,
        order_lines: [{
          type: 'digital',
          reference: invoice?.invoiceNumber || `INV-${Date.now()}`,
          name: `Legal Services - Invoice ${invoice?.invoiceNumber || ''}`,
          quantity: 1,
          unit_price: Math.round(amount * 100),
          tax_rate: 0,
          total_amount: Math.round(amount * 100),
          total_tax_amount: 0
        }],
        billing_address: {
          given_name: customer.firstName,
          family_name: customer.lastName,
          email: customer.email,
          street_address: customer.address?.street || '',
          postal_code: customer.address?.zipCode || '',
          city: customer.address?.city || '',
          region: customer.address?.state || '',
          country: customer.address?.country || 'US'
        }
      };

      // Create payment session
      const sessionResponse = await this.klarnaApi.post('/payments/v1/sessions', sessionData);

      if (paymentMethod.type === this.PAYMENT_METHODS.KLARNA_PAY_NOW) {
        // Process immediate payment
        const authResponse = await this.klarnaApi.post(
          `/payments/v1/sessions/${sessionResponse.data.session_id}/authorization`,
          {
            payment_method_category: 'pay_now',
            auto_capture: true
          }
        );

        return {
          paymentId: authResponse.data.order_id,
          sessionId: sessionResponse.data.session_id,
          status: this.mapKlarnaStatus(authResponse.data.status),
          transactionId: authResponse.data.order_id,
          fees: this.calculateKlarnaFees(amount),
          rawResponse: authResponse.data
        };
      } else {
        // Return session for client-side completion
        return {
          sessionId: sessionResponse.data.session_id,
          clientToken: sessionResponse.data.client_token,
          status: this.PAYMENT_STATUSES.PENDING,
          paymentCategories: sessionResponse.data.payment_method_categories,
          rawResponse: sessionResponse.data
        };
      }

    } catch (error) {
      throw new Error(`Klarna payment failed: ${error.response?.data?.error_messages?.[0] || error.message}`);
    }
  }

  /**
   * Affirm BNPL Payment Processing
   */
  async processAffirmPayment(paymentData) {
    const { amount, currency, paymentMethod, customer, invoice, metadata } = paymentData;

    try {
      // Create Affirm checkout
      const checkoutData = {
        merchant: {
          user_confirmation_url: `${process.env.BASE_URL}/payment/affirm/confirm`,
          user_cancel_url: `${process.env.BASE_URL}/payment/affirm/cancel`,
          user_confirmation_url_action: 'POST'
        },
        shipping: {
          name: {
            first: customer.firstName,
            last: customer.lastName
          },
          address: {
            line1: customer.address?.street || '',
            city: customer.address?.city || '',
            state: customer.address?.state || '',
            zipcode: customer.address?.zipCode || '',
            country: customer.address?.country || 'USA'
          }
        },
        billing: {
          name: {
            first: customer.firstName,
            last: customer.lastName
          },
          address: {
            line1: customer.address?.street || '',
            city: customer.address?.city || '',
            state: customer.address?.state || '',
            zipcode: customer.address?.zipCode || '',
            country: customer.address?.country || 'USA'
          }
        },
        items: [{
          display_name: `Legal Services - Invoice ${invoice?.invoiceNumber || ''}`,
          sku: invoice?.invoiceNumber || `INV-${Date.now()}`,
          unit_price: Math.round(amount * 100), // Convert to cents
          qty: 1,
          item_image_url: `${process.env.BASE_URL}/images/legal-services.png`,
          item_url: `${process.env.BASE_URL}/invoice/${invoice?.id}`,
          categories: [['Legal Services', 'Professional Services']]
        }],
        discounts: {},
        metadata: {
          invoice_id: invoice?.id,
          customer_id: customer.id,
          ...metadata
        },
        order_id: invoice?.invoiceNumber || `ORDER-${Date.now()}`,
        shipping_amount: 0,
        tax_amount: 0,
        total: Math.round(amount * 100) // Convert to cents
      };

      if (paymentMethod.checkoutToken) {
        // Authorize existing checkout
        const authResponse = await this.affirmApi.post('/api/v2/charges', {
          checkout_token: paymentMethod.checkoutToken
        });

        return {
          paymentId: authResponse.data.id,
          checkoutToken: paymentMethod.checkoutToken,
          status: this.mapAffirmStatus(authResponse.data.status),
          transactionId: authResponse.data.transaction_id,
          fees: this.calculateAffirmFees(amount),
          rawResponse: authResponse.data
        };
      } else {
        // Create new checkout session
        const checkoutResponse = await this.affirmApi.post('/api/v2/checkout', checkoutData);

        return {
          checkoutToken: checkoutResponse.data.checkout_token,
          redirectUrl: checkoutResponse.data.redirect_url,
          status: this.PAYMENT_STATUSES.PENDING,
          rawResponse: checkoutResponse.data
        };
      }

    } catch (error) {
      throw new Error(`Affirm payment failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create payment intent for client-side processing
   */
  async createPaymentIntent(intentData) {
    const {
      processor = 'STRIPE',
      amount,
      currency = 'USD',
      customer,
      invoice,
      metadata = {}
    } = intentData;

    try {
      let result;

      switch (processor.toUpperCase()) {
        case this.PAYMENT_PROCESSORS.STRIPE:
          result = await this.createStripeIntent(intentData);
          break;
        case this.PAYMENT_PROCESSORS.PAYPAL:
          result = await this.createPayPalOrder(intentData);
          break;
        case this.PAYMENT_PROCESSORS.SQUARE:
          result = await this.createSquarePaymentRequest(intentData);
          break;
        case this.PAYMENT_PROCESSORS.KLARNA:
          result = await this.createKlarnaSession(intentData);
          break;
        case this.PAYMENT_PROCESSORS.AFFIRM:
          result = await this.createAffirmCheckout(intentData);
          break;
        default:
          throw new Error(`Unsupported payment processor: ${processor}`);
      }

      return {
        success: true,
        processor: processor,
        ...result
      };

    } catch (error) {
      console.error(`Create payment intent error (${processor}):`, error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Create Stripe Payment Intent
   */
  async createStripeIntent(intentData) {
    const { amount, currency, customer, invoice, metadata } = intentData;

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      customer: customer.stripeCustomerId,
      metadata: {
        invoiceId: invoice?.id,
        clientId: customer.id,
        ...metadata
      },
      receipt_email: customer.email,
      description: `Legal Services Invoice ${invoice?.invoiceNumber || ''}`
    });

    return {
      clientSecret: paymentIntent.client_secret,
      intentId: paymentIntent.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    };
  }

  /**
   * Create PayPal Order
   */
  async createPayPalOrder(intentData) {
    const { amount, currency, customer, invoice } = intentData;

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toFixed(2)
        },
        description: `Legal Services Invoice ${invoice?.invoiceNumber || ''}`,
        invoice_id: invoice?.id
      }],
      application_context: {
        brand_name: 'LegalEstate',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW'
      }
    });

    const order = await this.paypalClient.execute(request);
    
    return {
      orderId: order.result.id,
      clientId: process.env.PAYPAL_CLIENT_ID
    };
  }

  /**
   * Create Square Payment Request
   */
  async createSquarePaymentRequest(intentData) {
    // Square doesn't have payment intents like Stripe
    // Return configuration for Square Web SDK
    return {
      applicationId: process.env.SQUARE_APPLICATION_ID,
      locationId: process.env.SQUARE_LOCATION_ID,
      environment: process.env.SQUARE_ENVIRONMENT || 'sandbox'
    };
  }

  /**
   * Create Klarna Payment Session
   */
  async createKlarnaSession(intentData) {
    const { amount, currency, customer, invoice } = intentData;

    const sessionData = {
      purchase_amount: Math.round(amount * 100),
      purchase_currency: currency,
      locale: customer.locale || 'en-US',
      order_amount: Math.round(amount * 100),
      order_tax_amount: 0,
      order_lines: [{
        type: 'digital',
        reference: invoice?.invoiceNumber || `INV-${Date.now()}`,
        name: `Legal Services - Invoice ${invoice?.invoiceNumber || ''}`,
        quantity: 1,
        unit_price: Math.round(amount * 100),
        tax_rate: 0,
        total_amount: Math.round(amount * 100),
        total_tax_amount: 0
      }],
      billing_address: {
        given_name: customer.firstName,
        family_name: customer.lastName,
        email: customer.email,
        street_address: customer.address?.street || '',
        postal_code: customer.address?.zipCode || '',
        city: customer.address?.city || '',
        region: customer.address?.state || '',
        country: customer.address?.country || 'US'
      }
    };

    const sessionResponse = await this.klarnaApi.post('/payments/v1/sessions', sessionData);

    return {
      sessionId: sessionResponse.data.session_id,
      clientToken: sessionResponse.data.client_token,
      paymentCategories: sessionResponse.data.payment_method_categories
    };
  }

  /**
   * Create Affirm Checkout
   */
  async createAffirmCheckout(intentData) {
    const { amount, currency, customer, invoice } = intentData;

    const checkoutData = {
      merchant: {
        user_confirmation_url: `${process.env.BASE_URL}/payment/affirm/confirm`,
        user_cancel_url: `${process.env.BASE_URL}/payment/affirm/cancel`,
        user_confirmation_url_action: 'POST'
      },
      shipping: {
        name: {
          first: customer.firstName,
          last: customer.lastName
        },
        address: {
          line1: customer.address?.street || '',
          city: customer.address?.city || '',
          state: customer.address?.state || '',
          zipcode: customer.address?.zipCode || '',
          country: customer.address?.country || 'USA'
        }
      },
      billing: {
        name: {
          first: customer.firstName,
          last: customer.lastName
        },
        address: {
          line1: customer.address?.street || '',
          city: customer.address?.city || '',
          state: customer.address?.state || '',
          zipcode: customer.address?.zipCode || '',
          country: customer.address?.country || 'USA'
        }
      },
      items: [{
        display_name: `Legal Services - Invoice ${invoice?.invoiceNumber || ''}`,
        sku: invoice?.invoiceNumber || `INV-${Date.now()}`,
        unit_price: Math.round(amount * 100),
        qty: 1,
        item_image_url: `${process.env.BASE_URL}/images/legal-services.png`,
        item_url: `${process.env.BASE_URL}/invoice/${invoice?.id}`,
        categories: [['Legal Services', 'Professional Services']]
      }],
      discounts: {},
      metadata: {
        invoice_id: invoice?.id,
        customer_id: customer.id
      },
      order_id: invoice?.invoiceNumber || `ORDER-${Date.now()}`,
      shipping_amount: 0,
      tax_amount: 0,
      total: Math.round(amount * 100)
    };

    const checkoutResponse = await this.affirmApi.post('/api/v2/checkout', checkoutData);

    return {
      checkoutToken: checkoutResponse.data.checkout_token,
      redirectUrl: checkoutResponse.data.redirect_url,
      publicApiKey: process.env.AFFIRM_PUBLIC_KEY
    };
  }

  /**
   * Process refund
   */
  async processRefund(refundData) {
    const {
      processor,
      paymentId,
      amount,
      reason = 'requested_by_customer'
    } = refundData;

    try {
      let result;

      switch (processor.toUpperCase()) {
        case this.PAYMENT_PROCESSORS.STRIPE:
          result = await this.processStripeRefund(paymentId, amount, reason);
          break;
        case this.PAYMENT_PROCESSORS.PAYPAL:
          result = await this.processPayPalRefund(paymentId, amount, reason);
          break;
        case this.PAYMENT_PROCESSORS.SQUARE:
          result = await this.processSquareRefund(paymentId, amount, reason);
          break;
        case this.PAYMENT_PROCESSORS.KLARNA:
          result = await this.processKlarnaRefund(paymentId, amount, reason);
          break;
        case this.PAYMENT_PROCESSORS.AFFIRM:
          result = await this.processAffirmRefund(paymentId, amount, reason);
          break;
        default:
          throw new Error(`Unsupported payment processor: ${processor}`);
      }

      return {
        success: true,
        processor: processor,
        ...result
      };

    } catch (error) {
      console.error(`Refund processing error (${processor}):`, error);
      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Stripe Refund
   */
  async processStripeRefund(paymentId, amount, reason) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason
    });

    return {
      refundId: refund.id,
      status: this.mapStripeRefundStatus(refund.status),
      amount: refund.amount / 100
    };
  }

  /**
   * PayPal Refund
   */
  async processPayPalRefund(captureId, amount, reason) {
    const request = new paypal.payments.CapturesRefundRequest(captureId);
    request.requestBody({
      amount: amount ? {
        currency_code: 'USD',
        value: amount.toFixed(2)
      } : undefined,
      note_to_payer: reason
    });

    const refund = await this.paypalClient.execute(request);

    return {
      refundId: refund.result.id,
      status: this.mapPayPalRefundStatus(refund.result.status),
      amount: parseFloat(refund.result.amount.value)
    };
  }

  /**
   * Square Refund
   */
  async processSquareRefund(paymentId, amount, reason) {
    const refundsApi = this.squareClient.refundsApi;

    const requestBody = {
      idempotency_key: `refund-${paymentId}-${Date.now()}`,
      amount_money: {
        amount: Math.round(amount * 100),
        currency: 'USD'
      },
      payment_id: paymentId,
      reason: reason
    };

    const response = await refundsApi.refundPayment(requestBody);

    return {
      refundId: response.result.refund.id,
      status: this.mapSquareRefundStatus(response.result.refund.status),
      amount: response.result.refund.amount_money.amount / 100
    };
  }

  /**
   * Klarna Refund
   */
  async processKlarnaRefund(orderId, amount, reason) {
    try {
      const refundData = {
        refunded_amount: Math.round(amount * 100)
      };

      const refund = await this.klarnaApi.post(`/ordermanagement/v1/orders/${orderId}/refunds`, refundData);

      return {
        refundId: refund.data.refund_id,
        status: this.PAYMENT_STATUSES.COMPLETED,
        amount: refund.data.refunded_amount / 100
      };
    } catch (error) {
      throw new Error(`Klarna refund failed: ${error.response?.data?.error_messages?.[0] || error.message}`);
    }
  }

  /**
   * Affirm Refund
   */
  async processAffirmRefund(chargeId, amount, reason) {
    try {
      const refundData = {
        amount: Math.round(amount * 100)
      };

      const refund = await this.affirmApi.post(`/api/v2/charges/${chargeId}/refunds`, refundData);

      return {
        refundId: refund.data.id,
        status: this.mapAffirmRefundStatus(refund.data.type),
        amount: refund.data.amount / 100
      };
    } catch (error) {
      throw new Error(`Affirm refund failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get supported payment methods by processor
   */
  getSupportedPaymentMethods(processor) {
    const methods = {
      [this.PAYMENT_PROCESSORS.STRIPE]: [
        this.PAYMENT_METHODS.CREDIT_CARD,
        this.PAYMENT_METHODS.DEBIT_CARD,
        this.PAYMENT_METHODS.ACH,
        this.PAYMENT_METHODS.APPLE_PAY,
        this.PAYMENT_METHODS.GOOGLE_PAY
      ],
      [this.PAYMENT_PROCESSORS.PAYPAL]: [
        this.PAYMENT_METHODS.PAYPAL,
        this.PAYMENT_METHODS.CREDIT_CARD,
        this.PAYMENT_METHODS.DEBIT_CARD
      ],
      [this.PAYMENT_PROCESSORS.SQUARE]: [
        this.PAYMENT_METHODS.CREDIT_CARD,
        this.PAYMENT_METHODS.DEBIT_CARD,
        this.PAYMENT_METHODS.APPLE_PAY,
        this.PAYMENT_METHODS.GOOGLE_PAY,
        this.PAYMENT_METHODS.CASH_APP
      ],
      [this.PAYMENT_PROCESSORS.KLARNA]: [
        this.PAYMENT_METHODS.KLARNA_PAY_NOW,
        this.PAYMENT_METHODS.KLARNA_PAY_LATER,
        this.PAYMENT_METHODS.KLARNA_SLICE_IT
      ],
      [this.PAYMENT_PROCESSORS.AFFIRM]: [
        this.PAYMENT_METHODS.AFFIRM_INSTALLMENTS
      ]
    };

    return methods[processor.toUpperCase()] || [];
  }

  /**
   * Calculate processing fees for each processor
   */
  calculateProcessingFees(processor, amount, paymentMethod = 'CREDIT_CARD') {
    switch (processor.toUpperCase()) {
      case this.PAYMENT_PROCESSORS.STRIPE:
        return this.calculateStripeFeesDetail(amount, paymentMethod);
      case this.PAYMENT_PROCESSORS.PAYPAL:
        return this.calculatePayPalFees(amount, paymentMethod);
      case this.PAYMENT_PROCESSORS.SQUARE:
        return this.calculateSquareFees(amount, paymentMethod);
      case this.PAYMENT_PROCESSORS.KLARNA:
        return this.calculateKlarnaFees(amount, paymentMethod);
      case this.PAYMENT_PROCESSORS.AFFIRM:
        return this.calculateAffirmFees(amount, paymentMethod);
      default:
        return { fixedFee: 0, percentageFee: 0, totalFee: 0 };
    }
  }

  calculateStripeFeesDetail(amount, paymentMethod = 'CREDIT_CARD') {
    let percentageRate = 0.029; // 2.9%
    let fixedFee = 0.30;

    if (paymentMethod === 'ACH') {
      percentageRate = 0.008; // 0.8%
      fixedFee = 5.00;
    }

    const percentageFee = amount * percentageRate;
    const totalFee = percentageFee + fixedFee;

    return {
      percentageRate: percentageRate * 100,
      fixedFee: fixedFee,
      percentageFee: Math.round(percentageFee * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100
    };
  }

  calculatePayPalFees(amount, paymentMethod = 'PAYPAL') {
    let percentageRate = 0.0349; // 3.49%
    let fixedFee = 0.49;

    if (paymentMethod === 'CREDIT_CARD') {
      percentageRate = 0.0349; // 3.49%
      fixedFee = 0.49;
    }

    const percentageFee = amount * percentageRate;
    const totalFee = percentageFee + fixedFee;

    return {
      percentageRate: percentageRate * 100,
      fixedFee: fixedFee,
      percentageFee: Math.round(percentageFee * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100
    };
  }

  calculateSquareFees(amount, paymentMethod = 'CREDIT_CARD') {
    let percentageRate = 0.026; // 2.6%
    let fixedFee = 0.10;

    const percentageFee = amount * percentageRate;
    const totalFee = percentageFee + fixedFee;

    return {
      percentageRate: percentageRate * 100,
      fixedFee: fixedFee,
      percentageFee: Math.round(percentageFee * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100
    };
  }

  calculateKlarnaFees(amount, paymentMethod = 'KLARNA_PAY_LATER') {
    // Klarna fees vary by payment method and region
    let percentageRate = 0.0599; // 5.99% for Pay Later
    let fixedFee = 0.30;

    if (paymentMethod === this.PAYMENT_METHODS.KLARNA_PAY_NOW) {
      percentageRate = 0.0299; // 2.99% for Pay Now
    } else if (paymentMethod === this.PAYMENT_METHODS.KLARNA_SLICE_IT) {
      percentageRate = 0.0699; // 6.99% for Slice It
    }

    const percentageFee = amount * percentageRate;
    const totalFee = percentageFee + fixedFee;

    return {
      percentageRate: percentageRate * 100,
      fixedFee: fixedFee,
      percentageFee: Math.round(percentageFee * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100
    };
  }

  calculateAffirmFees(amount, paymentMethod = 'AFFIRM_INSTALLMENTS') {
    // Affirm fees are typically passed to the consumer
    // Merchant fees vary based on contract
    let percentageRate = 0.10; // 10% charged to consumer over installments
    let merchantFee = 0.07; // 7% merchant fee (varies by contract)
    let fixedFee = 0.30;

    const percentageFee = amount * merchantFee;
    const totalFee = percentageFee + fixedFee;

    return {
      percentageRate: merchantFee * 100,
      fixedFee: fixedFee,
      percentageFee: Math.round(percentageFee * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100,
      consumerRate: percentageRate * 100, // Consumer pays this over installments
      note: 'Consumer pays additional installment fees'
    };
  }

  /**
   * Status mapping helpers
   */
  mapStripeStatus(stripeStatus) {
    const statusMap = {
      'requires_payment_method': this.PAYMENT_STATUSES.PENDING,
      'requires_confirmation': this.PAYMENT_STATUSES.PENDING,
      'requires_action': this.PAYMENT_STATUSES.PENDING,
      'processing': this.PAYMENT_STATUSES.PROCESSING,
      'requires_capture': this.PAYMENT_STATUSES.PROCESSING,
      'canceled': this.PAYMENT_STATUSES.CANCELLED,
      'succeeded': this.PAYMENT_STATUSES.COMPLETED
    };
    return statusMap[stripeStatus] || this.PAYMENT_STATUSES.PENDING;
  }

  mapPayPalStatus(paypalStatus) {
    const statusMap = {
      'CREATED': this.PAYMENT_STATUSES.PENDING,
      'SAVED': this.PAYMENT_STATUSES.PENDING,
      'APPROVED': this.PAYMENT_STATUSES.PROCESSING,
      'VOIDED': this.PAYMENT_STATUSES.CANCELLED,
      'COMPLETED': this.PAYMENT_STATUSES.COMPLETED,
      'PAYER_ACTION_REQUIRED': this.PAYMENT_STATUSES.PENDING
    };
    return statusMap[paypalStatus] || this.PAYMENT_STATUSES.PENDING;
  }

  mapSquareStatus(squareStatus) {
    const statusMap = {
      'APPROVED': this.PAYMENT_STATUSES.PROCESSING,
      'COMPLETED': this.PAYMENT_STATUSES.COMPLETED,
      'CANCELED': this.PAYMENT_STATUSES.CANCELLED,
      'FAILED': this.PAYMENT_STATUSES.FAILED
    };
    return statusMap[squareStatus] || this.PAYMENT_STATUSES.PENDING;
  }

  mapStripeRefundStatus(status) {
    const statusMap = {
      'pending': this.PAYMENT_STATUSES.PROCESSING,
      'succeeded': this.PAYMENT_STATUSES.COMPLETED,
      'failed': this.PAYMENT_STATUSES.FAILED,
      'canceled': this.PAYMENT_STATUSES.CANCELLED
    };
    return statusMap[status] || this.PAYMENT_STATUSES.PROCESSING;
  }

  mapPayPalRefundStatus(status) {
    const statusMap = {
      'COMPLETED': this.PAYMENT_STATUSES.COMPLETED,
      'PENDING': this.PAYMENT_STATUSES.PROCESSING,
      'CANCELLED': this.PAYMENT_STATUSES.CANCELLED,
      'FAILED': this.PAYMENT_STATUSES.FAILED
    };
    return statusMap[status] || this.PAYMENT_STATUSES.PROCESSING;
  }

  mapSquareRefundStatus(status) {
    const statusMap = {
      'PENDING': this.PAYMENT_STATUSES.PROCESSING,
      'COMPLETED': this.PAYMENT_STATUSES.COMPLETED,
      'REJECTED': this.PAYMENT_STATUSES.FAILED,
      'FAILED': this.PAYMENT_STATUSES.FAILED
    };
    return statusMap[status] || this.PAYMENT_STATUSES.PROCESSING;
  }

  mapKlarnaStatus(klarnaStatus) {
    const statusMap = {
      'PENDING': this.PAYMENT_STATUSES.PENDING,
      'AUTHORIZED': this.PAYMENT_STATUSES.PROCESSING,
      'CAPTURED': this.PAYMENT_STATUSES.COMPLETED,
      'CANCELLED': this.PAYMENT_STATUSES.CANCELLED,
      'EXPIRED': this.PAYMENT_STATUSES.CANCELLED,
      'FAILED': this.PAYMENT_STATUSES.FAILED
    };
    return statusMap[klarnaStatus] || this.PAYMENT_STATUSES.PENDING;
  }

  mapAffirmStatus(affirmStatus) {
    const statusMap = {
      'authorized': this.PAYMENT_STATUSES.PROCESSING,
      'captured': this.PAYMENT_STATUSES.COMPLETED,
      'voided': this.PAYMENT_STATUSES.CANCELLED,
      'failed': this.PAYMENT_STATUSES.FAILED
    };
    return statusMap[affirmStatus] || this.PAYMENT_STATUSES.PENDING;
  }

  mapAffirmRefundStatus(refundType) {
    // Affirm refund types: 'refund'
    return this.PAYMENT_STATUSES.COMPLETED;
  }

  /**
   * Get processor recommendation based on amount and payment method
   */
  getProcessorRecommendation(amount, paymentMethod, customerLocation = 'US') {
    const recommendations = [];

    // Calculate fees for each processor
    const stripeFees = this.calculateStripeFeesDetail(amount, paymentMethod);
    const paypalFees = this.calculatePayPalFees(amount, paymentMethod);
    const squareFees = this.calculateSquareFees(amount, paymentMethod);
    const klarnaFees = this.calculateKlarnaFees(amount, paymentMethod);
    const affirmFees = this.calculateAffirmFees(amount, paymentMethod);

    recommendations.push({
      processor: this.PAYMENT_PROCESSORS.STRIPE,
      totalFee: stripeFees.totalFee,
      pros: ['Most popular', 'Great developer tools', 'Strong dispute protection'],
      cons: ['Slightly higher fees for small transactions']
    });

    recommendations.push({
      processor: this.PAYMENT_PROCESSORS.PAYPAL,
      totalFee: paypalFees.totalFee,
      pros: ['Widely recognized', 'Buyer protection', 'No chargeback fees'],
      cons: ['Higher fees', 'Account holds possible']
    });

    recommendations.push({
      processor: this.PAYMENT_PROCESSORS.SQUARE,
      totalFee: squareFees.totalFee,
      pros: ['Lowest fees', 'Same-day deposits', 'Good for small businesses'],
      cons: ['Less international support', 'Fewer features']
    });

    recommendations.push({
      processor: this.PAYMENT_PROCESSORS.KLARNA,
      totalFee: klarnaFees.totalFee,
      pros: ['Buy Now Pay Later options', 'Higher conversion rates', 'Popular with younger consumers'],
      cons: ['Higher fees', 'Limited to certain demographics', 'Complex integration']
    });

    recommendations.push({
      processor: this.PAYMENT_PROCESSORS.AFFIRM,
      totalFee: affirmFees.totalFee,
      pros: ['Installment payments', 'No hidden fees for consumers', 'Higher average order values'],
      cons: ['Highest merchant fees', 'Complex approval process', 'Limited availability']
    });

    // Sort by total fee (lowest first)
    return recommendations.sort((a, b) => a.totalFee - b.totalFee);
  }
}

// Export singleton instance
module.exports = new UnifiedPaymentService();