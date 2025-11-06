import swaggerJsdoc from 'swagger-jsdoc';
import { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EarnFrom API Documentation',
      version: '1.0.0',
      description: 'API documentation for EarnFrom backend application - A platform for earning rewards through various tasks',
      contact: {
        name: 'API Support',
        email: 'support@earnfrom.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.earnfrom.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        SignatureAuth: {
          type: 'apiKey',
          in: 'query',
          name: 'signature',
          description: 'Authentication using signature, timestamp, and hash parameters'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Telegram user ID'
            },
            username: {
              type: 'string'
            },
            status: {
              type: 'string',
              enum: ['active', 'suspend']
            },
            watchedToday: {
              type: 'number'
            },
            lastAdWatch: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Wallet: {
          type: 'object',
          properties: {
            userId: {
              type: 'string'
            },
            balances: {
              type: 'object',
              properties: {
                xp: { type: 'number' },
                usdt: { type: 'number' },
                spin: { type: 'number' }
              }
            },
            locked: {
              type: 'object',
              properties: {
                xp: { type: 'number' },
                usdt: { type: 'number' },
                spin: { type: 'number' }
              }
            },
            totalEarned: {
              type: 'object',
              properties: {
                xp: { type: 'number' },
                usdt: { type: 'number' },
                spin: { type: 'number' }
              }
            }
          }
        },
        Activity: {
          type: 'object',
          properties: {
            userId: {
              type: 'string'
            },
            activityType: {
              type: 'string',
              enum: ['ad_watch', 'task_complete', 'spin', 'swap', 'withdrawal']
            },
            description: {
              type: 'string'
            },
            amount: {
              type: 'number'
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed']
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Ads',
        description: 'Ad watching endpoints'
      },
      {
        name: 'Tasks',
        description: 'Task management endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Wallet',
        description: 'Wallet and balance endpoints'
      },
      {
        name: 'Spin Wheel',
        description: 'Spin wheel game endpoints'
      },
      {
        name: 'Mystery Box',
        description: 'Mystery box endpoints'
      },
      {
        name: 'Swap',
        description: 'Currency swap endpoints'
      },
      {
        name: 'Withdrawal',
        description: 'Withdrawal endpoints'
      },
      {
        name: 'Admin',
        description: 'Admin management endpoints'
      },
      {
        name: 'Converter',
        description: 'Currency converter endpoints'
      },
      {
        name: 'Crypto Coins',
        description: 'Cryptocurrency coin endpoints'
      }
    ]
  },
  // Path to the API routes
  apis: [
    './src/routes/**/*.ts',
    './src/server.ts'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
