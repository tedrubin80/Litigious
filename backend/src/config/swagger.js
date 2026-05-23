const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Legal Estate Management API',
    version: '1.0.0',
    description: 'Comprehensive RESTful API for Legal Estate Management System',
    contact: {
      name: 'Legal Estate API Support',
      email: 'api-support@legal-estate.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3003/api/v1',
      description: 'Development server'
    },
    {
      url: 'https://api.legal-estate.com/v1',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from authentication endpoint'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            required: ['message', 'statusCode', 'timestamp'],
            properties: {
              message: {
                type: 'string',
                example: 'Error description'
              },
              statusCode: {
                type: 'integer',
                example: 400
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-01T00:00:00.000Z'
              },
              type: {
                type: 'string',
                example: 'VALIDATION_ERROR'
              },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' },
                    value: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      Success: {
        type: 'object',
        required: ['success', 'message', 'timestamp'],
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Operation completed successfully'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          },
          data: {
            type: 'object',
            description: 'Response data (varies by endpoint)'
          }
        }
      },
      PaginatedResponse: {
        allOf: [
          { $ref: '#/components/schemas/Success' },
          {
            type: 'object',
            properties: {
              pagination: {
                type: 'object',
                required: ['page', 'limit', 'total', 'pages', 'hasNext', 'hasPrev'],
                properties: {
                  page: { type: 'integer', example: 1 },
                  limit: { type: 'integer', example: 10 },
                  total: { type: 'integer', example: 100 },
                  pages: { type: 'integer', example: 10 },
                  hasNext: { type: 'boolean', example: true },
                  hasPrev: { type: 'boolean', example: false }
                }
              }
            }
          }
        ]
      },
      Client: {
        type: 'object',
        required: ['id', 'clientNumber', 'firstName', 'lastName', 'isActive', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique client identifier',
            example: 'cmevpagfu0000wl6ai566tx97'
          },
          clientNumber: {
            type: 'string',
            description: 'Auto-generated client number',
            example: 'CL20250001'
          },
          firstName: {
            type: 'string',
            description: 'Client first name',
            example: 'John',
            maxLength: 100
          },
          lastName: {
            type: 'string',
            description: 'Client last name',
            example: 'Doe',
            maxLength: 100
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Client email address',
            example: 'john.doe@example.com',
            nullable: true
          },
          phone: {
            type: 'string',
            description: 'Client phone number',
            example: '15551234567',
            nullable: true
          },
          mobile: {
            type: 'string',
            description: 'Client mobile number',
            example: '15559876543',
            nullable: true
          },
          address: {
            type: 'string',
            description: 'Client address',
            example: '123 Main St',
            maxLength: 500,
            nullable: true
          },
          city: {
            type: 'string',
            description: 'Client city',
            example: 'New York',
            maxLength: 100,
            nullable: true
          },
          state: {
            type: 'string',
            description: 'Client state',
            example: 'NY',
            maxLength: 50,
            nullable: true
          },
          zipCode: {
            type: 'string',
            description: 'Client ZIP code',
            example: '10001',
            pattern: '^\\d{5}(-\\d{4})?$',
            nullable: true
          },
          dateOfBirth: {
            type: 'string',
            format: 'date',
            description: 'Client date of birth',
            example: '1980-01-01',
            nullable: true
          },
          ssn: {
            type: 'string',
            description: 'Client Social Security Number',
            example: '123-45-6789',
            pattern: '^\\d{3}-\\d{2}-\\d{4}$',
            nullable: true
          },
          employer: {
            type: 'string',
            description: 'Client employer',
            example: 'Acme Corp',
            nullable: true
          },
          occupation: {
            type: 'string',
            description: 'Client occupation',
            example: 'Software Engineer',
            nullable: true
          },
          maritalStatus: {
            type: 'string',
            enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED'],
            description: 'Client marital status',
            nullable: true
          },
          spouseName: {
            type: 'string',
            description: 'Spouse name',
            example: 'Jane Doe',
            nullable: true
          },
          referredBy: {
            type: 'string',
            description: 'Who referred this client',
            example: 'Dr. Smith',
            nullable: true
          },
          preferredContact: {
            type: 'string',
            enum: ['EMAIL', 'PHONE', 'MAIL', 'TEXT', 'IN_PERSON'],
            description: 'Preferred contact method',
            default: 'EMAIL'
          },
          isActive: {
            type: 'boolean',
            description: 'Whether client is active',
            default: true
          },
          notes: {
            type: 'string',
            description: 'Additional notes about client',
            nullable: true
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'When client was created'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'When client was last updated'
          },
          cases: {
            type: 'array',
            description: 'Associated cases',
            items: { $ref: '#/components/schemas/CaseSummary' }
          },
          emergencyContacts: {
            type: 'array',
            description: 'Emergency contacts',
            items: { $ref: '#/components/schemas/EmergencyContact' }
          },
          _count: {
            type: 'object',
            description: 'Count of related records',
            properties: {
              cases: { type: 'integer' },
              communications: { type: 'integer' },
              tasks: { type: 'integer' }
            }
          }
        }
      },
      ClientCreateRequest: {
        type: 'object',
        required: ['firstName', 'lastName'],
        properties: {
          firstName: {
            type: 'string',
            description: 'Client first name',
            example: 'John',
            maxLength: 100
          },
          lastName: {
            type: 'string',
            description: 'Client last name',
            example: 'Doe',
            maxLength: 100
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Client email address',
            example: 'john.doe@example.com'
          },
          phone: {
            type: 'string',
            description: 'Client phone number (digits only)',
            example: '15551234567'
          },
          mobile: {
            type: 'string',
            description: 'Client mobile number (digits only)',
            example: '15559876543'
          },
          address: {
            type: 'string',
            description: 'Client address',
            example: '123 Main St',
            maxLength: 500
          },
          city: {
            type: 'string',
            description: 'Client city',
            example: 'New York',
            maxLength: 100
          },
          state: {
            type: 'string',
            description: 'Client state',
            example: 'NY',
            maxLength: 50
          },
          zipCode: {
            type: 'string',
            description: 'Client ZIP code',
            example: '10001',
            pattern: '^\\d{5}(-\\d{4})?$'
          },
          dateOfBirth: {
            type: 'string',
            format: 'date',
            description: 'Client date of birth',
            example: '1980-01-01'
          },
          ssn: {
            type: 'string',
            description: 'Client Social Security Number',
            example: '123-45-6789',
            pattern: '^\\d{3}-\\d{2}-\\d{4}$'
          },
          employer: {
            type: 'string',
            description: 'Client employer',
            example: 'Acme Corp'
          },
          occupation: {
            type: 'string',
            description: 'Client occupation',
            example: 'Software Engineer'
          },
          maritalStatus: {
            type: 'string',
            enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED'],
            description: 'Client marital status'
          },
          spouseName: {
            type: 'string',
            description: 'Spouse name',
            example: 'Jane Doe'
          },
          referredBy: {
            type: 'string',
            description: 'Who referred this client',
            example: 'Dr. Smith'
          },
          preferredContact: {
            type: 'string',
            enum: ['EMAIL', 'PHONE', 'MAIL', 'TEXT', 'IN_PERSON'],
            description: 'Preferred contact method',
            default: 'EMAIL'
          },
          notes: {
            type: 'string',
            description: 'Additional notes about client'
          }
        }
      },
      CaseSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          caseNumber: { type: 'string' },
          caseType: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
          dateOpened: { type: 'string', format: 'date-time' },
          dateClosed: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      EmergencyContact: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          relationship: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: [
    './src/routes/api-v1.js',
    './src/controllers/*.js',
    './src/routes/*.js'
  ]
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;