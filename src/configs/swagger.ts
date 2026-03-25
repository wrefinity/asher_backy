const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Asher Property Management API',
    version: '1.0.0',
    description: 'Complete API documentation for the Asher Application, including endpoints for Auth, Tenants, Landlords, Vendors, Properties, Maintenance, and more.',
  },
  servers: [
    {
      url: 'http://localhost9000',
      description: 'Development server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication, Registration, Password Recovery, and related operations' },
    { name: 'Users', description: 'User management' },
    { name: 'Profile', description: 'User profile management' },
    { name: 'Tenants', description: 'Tenant-specific operations' },
    { name: 'Tenant - Bills', description: 'Tenant bill management and payments' },
    { name: 'Tenant - Maintenance', description: 'Tenant maintenance requests' },
    { name: 'Tenant - Properties', description: 'Tenant property views' },
    { name: 'Tenant - Violations', description: 'Tenant violation records' },
    { name: 'Tenant - Dashboard', description: 'Tenant dashboard data' },
    { name: 'Tenant - Lease', description: 'Tenant lease renewals and extensions' },
    { name: 'Tenant - Documents', description: 'Tenant document requests' },
    { name: 'Landlords', description: 'Landlord-specific operations' },
    { name: 'Landlord - Properties', description: 'Landlord property management' },
    { name: 'Landlord - Tenants', description: 'Landlord tenant management' },
    { name: 'Landlord - Maintenance', description: 'Landlord maintenance oversight' },
    { name: 'Landlord - Inspections', description: 'Landlord property inspections' },
    { name: 'Landlord - Finance', description: 'Landlord financial management' },
    { name: 'Landlord - Analytics', description: 'Landlord analytics and reports' },
    { name: 'Landlord - Bills', description: 'Landlord bill management' },
    { name: 'Landlord - Violations', description: 'Landlord violation management' },
    { name: 'Landlord - Lease', description: 'Landlord lease renewal management' },
    { name: 'Vendors', description: 'Vendor-specific operations' },
    { name: 'Properties', description: 'Property listings, management, and details' },
    { name: 'Maintenance', description: 'Maintenance requests and processing' },
    { name: 'Inspections', description: 'Property inspections' },
    { name: 'Transactions', description: 'Financial transactions, tracking, and logs' },
    { name: 'Wallet', description: 'User wallet management and funding' },
    { name: 'Payouts', description: 'Withdrawals and payouts for landlords and vendors' },
    { name: 'Community', description: 'Community forums, threads, and interactions' },
    { name: 'Chat', description: 'Real-time chat interactions between users' },
    { name: 'Admin', description: 'Administrative operations and oversight' },
    { name: 'Reviews', description: 'Property and service reviews' },
    { name: 'Application', description: 'Rental application management' },
    { name: 'Notifications', description: 'Push and in-app notifications' },
    { name: 'Complaints', description: 'Complaints and dispute management' },
    { name: 'Suggestions', description: 'User suggestions' },
    { name: 'Credit Score', description: 'Tenant credit score operations' },
    { name: 'Banks', description: 'Bank account management' },
    { name: 'Categories', description: 'Property and service categories' },
    { name: 'Ads', description: 'Advertisement management' },
    { name: 'Support', description: 'Support content and help articles' },
    { name: 'DocuSign', description: 'Document signing via DocuSign' },
    { name: 'File Uploads', description: 'File upload endpoints' },
    { name: 'Todos', description: 'Todo task management' },
    { name: 'State & Status', description: 'App state and status endpoints' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Operation failed' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          errors: { type: 'array', items: { type: 'string' } },
          details: { type: 'object' }
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: { type: 'object' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 6, example: 'securepassword123' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'firstName', 'lastName', 'password', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          password: { type: 'string', minLength: 8 },
          role: { type: 'string', enum: ['TENANT', 'LANDLORD', 'VENDOR', 'ADMIN'], default: 'TENANT' },
        },
      },
      VerifyOTPRequest: {
        type: 'object',
        required: ['email', 'token'],
        properties: {
          email: { type: 'string', format: 'email' },
          token: { type: 'string', description: '6-digit OTP' },
        },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['email', 'token', 'newPassword'],
        properties: {
          email: { type: 'string', format: 'email' },
          token: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      MaintenanceRequest: {
        type: 'object',
        required: ['title', 'description', 'propertyId'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          propertyId: { type: 'string' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          category: { type: 'string' },
        },
      },
      PayBillRequest: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', example: 50000 },
          paymentMethod: { type: 'string', enum: ['wallet', 'card', 'bank_transfer'], default: 'wallet' },
          walletId: { type: 'string' },
          paymentGateway: { type: 'string', enum: ['stripe', 'paystack', 'flutterwave'] },
        },
      },
      FundWalletRequest: {
        type: 'object',
        required: ['amount', 'paymentGateway'],
        properties: {
          amount: { type: 'number', example: 100000 },
          paymentGateway: { type: 'string', enum: ['stripe', 'paystack', 'flutterwave'] },
          currency: { type: 'string', enum: ['NGN', 'USD', 'GBP'], default: 'NGN' },
          countryCode: { type: 'string', example: 'NG' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {

    // ===================================================================
    // AUTH
    // ===================================================================
    '/api/auth/login': {
      post: {
        summary: 'Login with email and password',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
          '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout current user',
        tags: ['Auth'],
        responses: {
          '200': { description: 'Logged out successfully' }
        }
      }
    },
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } }
        },
        responses: {
          '200': { description: 'Registration successful' },
          '400': { description: 'Validation error' }
        }
      }
    },
    '/api/auth/tenants/register': {
      post: {
        summary: 'Register a new tenant user',
        tags: ['Auth', 'Tenants'],
        security: [],
        responses: {
          '200': { description: 'Tenant registered successfully' }
        }
      }
    },
    '/api/auth/register-vendor': {
      post: {
        summary: 'Register a new vendor user',
        tags: ['Auth', 'Vendors'],
        security: [],
        responses: {
          '200': { description: 'Vendor registered successfully' }
        }
      }
    },
    '/api/auth/verify': {
      post: {
        summary: 'Verify account via OTP confirmation',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyOTPRequest' } } }
        },
        responses: {
          '200': { description: 'Account verified successfully' },
          '400': { description: 'Invalid or expired OTP' }
        }
      }
    },
    '/api/auth/verify-otp/token': {
      post: {
        summary: 'Generic OTP token verification',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyOTPRequest' } } }
        },
        responses: {
          '200': { description: 'Token verified successfully' }
        }
      }
    },
    '/api/auth/send-token': {
      post: {
        summary: 'Send OTP token to user email',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Token sent successfully' }
        }
      }
    },
    '/api/auth/reset-code': {
      post: {
        summary: 'Send password reset code to email',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Reset code sent' }
        }
      }
    },
    '/api/auth/reset-password': {
      post: {
        summary: 'Reset password using reset code',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } } }
        },
        responses: {
          '200': { description: 'Password reset successful' },
          '400': { description: 'Invalid token or password' }
        }
      }
    },
    '/api/auth/refresh-token': {
      post: {
        summary: 'Refresh access token using refresh token',
        tags: ['Auth'],
        security: [],
        responses: {
          '200': { description: 'Token refreshed successfully' }
        }
      }
    },
    '/api/auth/update-password': {
      post: {
        summary: 'Update password for authenticated user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Password updated successfully' }
        }
      }
    },
    '/api/auth/google-auth': {
      post: {
        summary: 'Authenticate using Google OAuth token',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: { token: { type: 'string', description: 'Google ID token' } }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Google authentication successful' }
        }
      }
    },

    // ===================================================================
    // USERS
    // ===================================================================
    '/api/users': {
      get: {
        summary: 'Get all users',
        tags: ['Users'],
        responses: {
          '200': { description: 'Users retrieved successfully' }
        }
      }
    },
    '/api/users/{id}': {
      get: {
        summary: 'Get user by ID',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User retrieved successfully' },
          '404': { description: 'User not found' }
        }
      },
      patch: {
        summary: 'Update user by ID',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User updated successfully' }
        }
      },
      delete: {
        summary: 'Delete user by ID',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User deleted successfully' }
        }
      }
    },

    // ===================================================================
    // PROFILE
    // ===================================================================
    '/api/profile': {
      get: {
        summary: 'Get current user profile',
        tags: ['Profile'],
        responses: {
          '200': { description: 'Profile retrieved successfully' }
        }
      },
      patch: {
        summary: 'Update current user profile',
        tags: ['Profile'],
        responses: {
          '200': { description: 'Profile updated successfully' }
        }
      }
    },

    // ===================================================================
    // PROPERTIES (General)
    // ===================================================================
    '/api/properties': {
      get: {
        summary: 'Get all properties',
        tags: ['Properties'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Properties retrieved successfully' }
        }
      },
      post: {
        summary: 'Create a new property',
        tags: ['Properties'],
        responses: {
          '201': { description: 'Property created successfully' }
        }
      }
    },
    '/api/properties/{id}': {
      get: {
        summary: 'Get property by ID',
        tags: ['Properties'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Property retrieved successfully' },
          '404': { description: 'Property not found' }
        }
      },
      patch: {
        summary: 'Update a property',
        tags: ['Properties'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Property updated successfully' }
        }
      },
      delete: {
        summary: 'Delete a property',
        tags: ['Properties'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Property deleted successfully' }
        }
      }
    },

    // ===================================================================
    // MAINTENANCE (General)
    // ===================================================================
    '/api/maintenance': {
      get: {
        summary: 'Get all maintenance requests',
        tags: ['Maintenance'],
        responses: {
          '200': { description: 'Maintenance requests retrieved' }
        }
      },
      post: {
        summary: 'Submit a new maintenance request',
        tags: ['Maintenance'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MaintenanceRequest' } } }
        },
        responses: {
          '201': { description: 'Maintenance request created' }
        }
      }
    },
    '/api/maintenance/{id}': {
      get: {
        summary: 'Get maintenance request by ID',
        tags: ['Maintenance'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Maintenance request retrieved' }
        }
      },
      patch: {
        summary: 'Update maintenance request',
        tags: ['Maintenance'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Maintenance request updated' }
        }
      }
    },

    // ===================================================================
    // APPLICATION
    // ===================================================================
    '/api/application': {
      get: {
        summary: 'Get all applications',
        tags: ['Application'],
        responses: {
          '200': { description: 'Applications retrieved' }
        }
      },
      post: {
        summary: 'Submit a new rental application',
        tags: ['Application'],
        responses: {
          '201': { description: 'Application submitted' }
        }
      }
    },
    '/api/application/{id}': {
      get: {
        summary: 'Get application by ID',
        tags: ['Application'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Application retrieved' }
        }
      },
      patch: {
        summary: 'Update application status',
        tags: ['Application'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Application updated' }
        }
      }
    },

    // ===================================================================
    // WALLET
    // ===================================================================
    '/api/wallet/balance': {
      get: {
        summary: 'Get current user wallet balance',
        tags: ['Wallet'],
        responses: {
          '200': { description: 'Wallet balance retrieved' }
        }
      }
    },
    '/api/wallet/fund': {
      post: {
        summary: 'Fund wallet via payment gateway',
        tags: ['Wallet'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FundWalletRequest' } } }
        },
        responses: {
          '200': { description: 'Wallet funded successfully' }
        }
      }
    },
    '/api/wallet/history': {
      get: {
        summary: 'Get wallet transaction history',
        tags: ['Wallet'],
        responses: {
          '200': { description: 'Wallet history retrieved' }
        }
      }
    },

    // ===================================================================
    // TRANSACTIONS
    // ===================================================================
    '/api/transactions': {
      get: {
        summary: 'Get all transactions',
        tags: ['Transactions'],
        responses: {
          '200': { description: 'Transactions retrieved' }
        }
      }
    },
    '/api/transactions/{id}': {
      get: {
        summary: 'Get transaction by ID',
        tags: ['Transactions'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Transaction retrieved' }
        }
      }
    },

    // ===================================================================
    // PAYOUTS
    // ===================================================================
    '/api/payouts': {
      get: {
        summary: 'Get all payouts',
        tags: ['Payouts'],
        responses: {
          '200': { description: 'Payouts retrieved' }
        }
      },
      post: {
        summary: 'Request a payout withdrawal',
        tags: ['Payouts'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'bankAccountId'],
                properties: {
                  amount: { type: 'number' },
                  bankAccountId: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Payout request submitted' }
        }
      }
    },

    // ===================================================================
    // COMMUNITY
    // ===================================================================
    '/api/community': {
      get: {
        summary: 'Get community threads/posts',
        tags: ['Community'],
        responses: {
          '200': { description: 'Community posts retrieved' }
        }
      },
      post: {
        summary: 'Create a new community post',
        tags: ['Community'],
        responses: {
          '201': { description: 'Community post created' }
        }
      }
    },
    '/api/community/{id}': {
      get: {
        summary: 'Get community post by ID',
        tags: ['Community'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Community post retrieved' }
        }
      }
    },

    // ===================================================================
    // CHATS
    // ===================================================================
    '/api/chats': {
      get: {
        summary: 'Get all chat rooms for current user',
        tags: ['Chat'],
        responses: {
          '200': { description: 'Chat rooms retrieved' }
        }
      },
      post: {
        summary: 'Create or open a chat room',
        tags: ['Chat'],
        responses: {
          '201': { description: 'Chat room created' }
        }
      }
    },
    '/api/chats/{roomId}/messages': {
      get: {
        summary: 'Get messages in a chat room',
        tags: ['Chat'],
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Messages retrieved' }
        }
      },
      post: {
        summary: 'Send a message to a chat room',
        tags: ['Chat'],
        parameters: [{ name: 'roomId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '201': { description: 'Message sent' }
        }
      }
    },

    // ===================================================================
    // REVIEWS
    // ===================================================================
    '/api/reviews': {
      get: {
        summary: 'Get all reviews',
        tags: ['Reviews'],
        responses: {
          '200': { description: 'Reviews retrieved' }
        }
      },
      post: {
        summary: 'Submit a review',
        tags: ['Reviews'],
        responses: {
          '201': { description: 'Review submitted' }
        }
      }
    },

    // ===================================================================
    // NOTIFICATIONS
    // ===================================================================
    '/api/notification': {
      get: {
        summary: 'Get notifications for current user',
        tags: ['Notifications'],
        responses: {
          '200': { description: 'Notifications retrieved' }
        }
      }
    },
    '/api/notification/{id}/read': {
      patch: {
        summary: 'Mark notification as read',
        tags: ['Notifications'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Notification marked as read' }
        }
      }
    },

    // ===================================================================
    // COMPLAINTS
    // ===================================================================
    '/api/complaints': {
      get: {
        summary: 'Get all complaints',
        tags: ['Complaints'],
        responses: {
          '200': { description: 'Complaints retrieved' }
        }
      },
      post: {
        summary: 'Submit a new complaint',
        tags: ['Complaints'],
        responses: {
          '201': { description: 'Complaint submitted' }
        }
      }
    },
    '/api/complaints/{id}': {
      get: {
        summary: 'Get complaint by ID',
        tags: ['Complaints'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Complaint retrieved' }
        }
      },
      patch: {
        summary: 'Update complaint status',
        tags: ['Complaints'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Complaint updated' }
        }
      }
    },

    // ===================================================================
    // SUGGESTIONS
    // ===================================================================
    '/api/suggestions': {
      get: {
        summary: 'Get all suggestions',
        tags: ['Suggestions'],
        responses: {
          '200': { description: 'Suggestions retrieved' }
        }
      },
      post: {
        summary: 'Submit a suggestion',
        tags: ['Suggestions'],
        responses: {
          '201': { description: 'Suggestion submitted' }
        }
      }
    },

    // ===================================================================
    // CREDIT SCORE
    // ===================================================================
    '/api/credit-score': {
      get: {
        summary: 'Get credit score for current user',
        tags: ['Credit Score'],
        responses: {
          '200': { description: 'Credit score retrieved' }
        }
      }
    },

    // ===================================================================
    // BANKS
    // ===================================================================
    '/api/banks': {
      get: {
        summary: 'Get all saved bank accounts',
        tags: ['Banks'],
        responses: {
          '200': { description: 'Bank accounts retrieved' }
        }
      },
      post: {
        summary: 'Add a new bank account',
        tags: ['Banks'],
        responses: {
          '201': { description: 'Bank account added' }
        }
      }
    },
    '/api/banks/{id}': {
      delete: {
        summary: 'Remove a bank account',
        tags: ['Banks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Bank account removed' }
        }
      }
    },

    // ===================================================================
    // CATEGORIES
    // ===================================================================
    '/api/categories': {
      get: {
        summary: 'Get all categories',
        tags: ['Categories'],
        responses: {
          '200': { description: 'Categories retrieved' }
        }
      },
      post: {
        summary: 'Create a category',
        tags: ['Categories'],
        responses: {
          '201': { description: 'Category created' }
        }
      }
    },

    // ===================================================================
    // ADS
    // ===================================================================
    '/api/ads': {
      get: {
        summary: 'Get all advertisements',
        tags: ['Ads'],
        responses: {
          '200': { description: 'Ads retrieved' }
        }
      },
      post: {
        summary: 'Create a new advertisement',
        tags: ['Ads'],
        responses: {
          '201': { description: 'Ad created' }
        }
      }
    },

    // ===================================================================
    // SUPPORT CONTENT
    // ===================================================================
    '/api/support-content': {
      get: {
        summary: 'Get support articles and help content',
        tags: ['Support'],
        responses: {
          '200': { description: 'Support content retrieved' }
        }
      }
    },

    // ===================================================================
    // DOCUSIGN
    // ===================================================================
    '/api/docusign/send': {
      post: {
        summary: 'Send document for signing via DocuSign',
        tags: ['DocuSign'],
        responses: {
          '200': { description: 'Document sent for signing' }
        }
      }
    },
    '/api/docusign/status/{envelopeId}': {
      get: {
        summary: 'Get DocuSign envelope status',
        tags: ['DocuSign'],
        parameters: [{ name: 'envelopeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Envelope status retrieved' }
        }
      }
    },

    // ===================================================================
    // FILE UPLOADS
    // ===================================================================
    '/api/file-uploads': {
      post: {
        summary: 'Upload files to cloud storage',
        tags: ['File Uploads'],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  files: { type: 'array', items: { type: 'string', format: 'binary' } }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Files uploaded successfully' }
        }
      }
    },

    // ===================================================================
    // TODOS
    // ===================================================================
    '/api/todos': {
      get: {
        summary: 'Get all todos for current user',
        tags: ['Todos'],
        responses: {
          '200': { description: 'Todos retrieved' }
        }
      },
      post: {
        summary: 'Create a new todo',
        tags: ['Todos'],
        responses: {
          '201': { description: 'Todo created' }
        }
      }
    },
    '/api/todos/{id}': {
      patch: {
        summary: 'Update todo',
        tags: ['Todos'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Todo updated' }
        }
      },
      delete: {
        summary: 'Delete todo',
        tags: ['Todos'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Todo deleted' }
        }
      }
    },

    // ===================================================================
    // STATE & STATUS
    // ===================================================================
    '/api/status': {
      get: {
        summary: 'Get app status',
        tags: ['State & Status'],
        security: [],
        responses: {
          '200': { description: 'Status ok' }
        }
      }
    },
    '/api/state': {
      get: {
        summary: 'Get available states/regions',
        tags: ['State & Status'],
        security: [],
        responses: {
          '200': { description: 'States retrieved' }
        }
      }
    },

    // ===================================================================
    // ADMIN
    // ===================================================================
    '/api/admin/users': {
      get: {
        summary: 'Admin: Get all users',
        tags: ['Admin'],
        responses: {
          '200': { description: 'Users retrieved' }
        }
      }
    },
    '/api/admin/users/{id}': {
      patch: {
        summary: 'Admin: Update user',
        tags: ['Admin'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User updated' }
        }
      },
      delete: {
        summary: 'Admin: Delete user',
        tags: ['Admin'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User deleted' }
        }
      }
    },
    '/api/admin/properties': {
      get: {
        summary: 'Admin: Get all properties',
        tags: ['Admin'],
        responses: {
          '200': { description: 'Properties retrieved' }
        }
      }
    },

    // ===================================================================
    // TENANT ROUTES (/api/tenants/*)
    // Requires TENANT role authentication
    // ===================================================================
    '/api/tenants/{tenantId}': {
      get: {
        summary: 'Get tenant by ID',
        tags: ['Tenants'],
        parameters: [{ name: 'tenantId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Tenant retrieved' }
        }
      }
    },
    '/api/tenants/tenant-scores': {
      get: {
        summary: 'Get tenant performance scores',
        tags: ['Tenants'],
        responses: {
          '200': { description: 'Tenant scores retrieved' }
        }
      }
    },

    // Tenant Bills
    '/api/tenants/bills': {
      get: {
        summary: 'Get all bills for current tenant',
        tags: ['Tenant - Bills'],
        responses: {
          '200': { description: 'Bills retrieved' }
        }
      }
    },
    '/api/tenants/bills/{billId}': {
      get: {
        summary: 'Get bill by ID',
        tags: ['Tenant - Bills'],
        parameters: [{ name: 'billId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Bill retrieved' }
        }
      }
    },
    '/api/tenants/bills/{billId}/pay': {
      post: {
        summary: 'Pay a bill',
        tags: ['Tenant - Bills'],
        parameters: [{ name: 'billId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PayBillRequest' } } }
        },
        responses: {
          '200': { description: 'Bill payment processed' }
        }
      }
    },
    '/api/tenants/bills/upcoming': {
      get: {
        summary: 'Get upcoming bills for tenant',
        tags: ['Tenant - Bills'],
        responses: {
          '200': { description: 'Upcoming bills retrieved' }
        }
      }
    },

    // Tenant Payments & Wallet
    '/api/tenants/payments/history': {
      get: {
        summary: 'Get tenant payment history',
        tags: ['Tenant - Bills'],
        responses: {
          '200': { description: 'Payment history retrieved' }
        }
      }
    },
    '/api/tenants/wallet/balance': {
      get: {
        summary: 'Get tenant wallet balance',
        tags: ['Tenant - Bills'],
        responses: {
          '200': { description: 'Wallet balance retrieved' }
        }
      }
    },
    '/api/tenants/wallet/fund': {
      post: {
        summary: 'Fund tenant wallet',
        tags: ['Tenant - Bills'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FundWalletRequest' } } }
        },
        responses: {
          '200': { description: 'Wallet funded' }
        }
      }
    },

    // Tenant Maintenance
    '/api/tenants/maintenances/requests': {
      get: {
        summary: 'Get maintenance requests for current tenant',
        tags: ['Tenant - Maintenance'],
        responses: {
          '200': { description: 'Maintenance requests retrieved' }
        }
      },
      post: {
        summary: 'Create a maintenance request',
        tags: ['Tenant - Maintenance'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MaintenanceRequest' } } }
        },
        responses: {
          '201': { description: 'Maintenance request created' }
        }
      }
    },
    '/api/tenants/maintenances/requests/{id}': {
      get: {
        summary: 'Get maintenance request by ID',
        tags: ['Tenant - Maintenance'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Maintenance request retrieved' }
        }
      }
    },

    // Tenant Dashboard
    '/api/tenants/dashboard': {
      get: {
        summary: 'Get tenant dashboard summary',
        tags: ['Tenant - Dashboard'],
        responses: {
          '200': { description: 'Dashboard data retrieved' }
        }
      }
    },

    // Tenant Profile
    '/api/tenants/profile': {
      get: {
        summary: 'Get tenant profile',
        tags: ['Tenants'],
        responses: {
          '200': { description: 'Tenant profile retrieved' }
        }
      },
      patch: {
        summary: 'Update tenant profile',
        tags: ['Tenants'],
        responses: {
          '200': { description: 'Tenant profile updated' }
        }
      }
    },

    // Tenant Properties
    '/api/tenants/properties': {
      get: {
        summary: 'Get properties associated with current tenant',
        tags: ['Tenant - Properties'],
        responses: {
          '200': { description: 'Properties retrieved' }
        }
      }
    },

    // Tenant Violations
    '/api/tenants/violations': {
      get: {
        summary: 'Get violations for current tenant',
        tags: ['Tenant - Violations'],
        responses: {
          '200': { description: 'Violations retrieved' }
        }
      }
    },

    // Tenant Document Requests
    '/api/tenants/document-requests': {
      get: {
        summary: 'Get document requests for current tenant',
        tags: ['Tenant - Documents'],
        responses: {
          '200': { description: 'Document requests retrieved' }
        }
      },
      post: {
        summary: 'Submit a document request',
        tags: ['Tenant - Documents'],
        responses: {
          '201': { description: 'Document request submitted' }
        }
      }
    },

    // Tenant Lease Renewal
    '/api/tenants/lease-renewal': {
      get: {
        summary: 'Get lease renewal requests for tenant',
        tags: ['Tenant - Lease'],
        responses: {
          '200': { description: 'Lease renewals retrieved' }
        }
      },
      post: {
        summary: 'Submit a lease renewal request',
        tags: ['Tenant - Lease'],
        responses: {
          '201': { description: 'Lease renewal request submitted' }
        }
      }
    },
    '/api/tenants/lease-renewal/current-lease': {
      get: {
        summary: 'Get current lease info for tenant',
        tags: ['Tenant - Lease'],
        responses: {
          '200': { description: 'Current lease info retrieved' }
        }
      }
    },

    // Tenant Lease Extension
    '/api/tenants/lease-extension': {
      get: {
        summary: 'Get lease extension requests',
        tags: ['Tenant - Lease'],
        responses: {
          '200': { description: 'Lease extensions retrieved' }
        }
      },
      post: {
        summary: 'Submit a lease extension request',
        tags: ['Tenant - Lease'],
        responses: {
          '201': { description: 'Lease extension request submitted' }
        }
      }
    },

    // Tenant Inspections
    '/api/inspections': {
      get: {
        summary: 'Get inspections for current tenant',
        tags: ['Inspections'],
        responses: {
          '200': { description: 'Inspections retrieved' }
        }
      },
      post: {
        summary: 'Schedule a property inspection',
        tags: ['Inspections'],
        responses: {
          '201': { description: 'Inspection scheduled' }
        }
      }
    },

    // ===================================================================
    // LANDLORD ROUTES (/api/landlord/*)
    // Requires LANDLORD role authentication
    // ===================================================================
    '/api/landlord/info': {
      get: {
        summary: 'Get landlord profile info',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Landlord info retrieved' }
        }
      },
      post: {
        summary: 'Update landlord profile info',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Landlord info updated' }
        }
      }
    },
    '/api/landlord': {
      get: {
        summary: 'Get all landlords',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Landlords retrieved' }
        }
      }
    },
    '/api/landlord/{id}': {
      get: {
        summary: 'Get landlord by ID',
        tags: ['Landlords'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Landlord retrieved' }
        }
      },
      patch: {
        summary: 'Update landlord by ID',
        tags: ['Landlords'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Landlord updated' }
        }
      },
      delete: {
        summary: 'Delete landlord by ID',
        tags: ['Landlords'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Landlord deleted' }
        }
      }
    },
    '/api/landlord/jobs/current': {
      get: {
        summary: 'Get current vendor jobs for landlord properties',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Current jobs retrieved' }
        }
      }
    },
    '/api/landlord/jobs/completed': {
      get: {
        summary: 'Get completed vendor jobs for landlord properties',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Completed jobs retrieved' }
        }
      }
    },
    '/api/landlord/locations/list': {
      get: {
        summary: 'Get current locations for landlord properties',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Locations retrieved' }
        }
      }
    },
    '/api/landlord/properties/list': {
      get: {
        summary: 'Get all landlord properties (list)',
        tags: ['Landlord - Properties'],
        responses: {
          '200': { description: 'Properties list retrieved' }
        }
      }
    },

    // Landlord Properties
    '/api/landlord/properties/property': {
      get: {
        summary: 'Get current landlord properties',
        tags: ['Landlord - Properties'],
        responses: {
          '200': { description: 'Properties retrieved' }
        }
      }
    },
    '/api/landlord/properties/create': {
      post: {
        summary: 'Create a new property',
        tags: ['Landlord - Properties'],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  files: { type: 'array', items: { type: 'string', format: 'binary' } },
                  name: { type: 'string' },
                  address: { type: 'string' },
                  type: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Property created' }
        }
      }
    },
    '/api/landlord/properties/upload': {
      post: {
        summary: 'Bulk upload properties via JSON',
        tags: ['Landlord - Properties'],
        responses: {
          '201': { description: 'Properties bulk created' }
        }
      }
    },
    '/api/landlord/properties/property/{propertyId}': {
      patch: {
        summary: 'Update a specific property',
        tags: ['Landlord - Properties'],
        parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Property updated' }
        }
      },
      delete: {
        summary: 'Delete a property',
        tags: ['Landlord - Properties'],
        parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Property deleted' }
        }
      }
    },
    '/api/landlord/properties/property/status/{propertyId}': {
      patch: {
        summary: 'Update property availability status',
        tags: ['Landlord - Properties'],
        parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Status updated' }
        }
      }
    },
    '/api/landlord/properties/property/tenants/{propertyId}': {
      get: {
        summary: 'Get tenants for a specific property',
        tags: ['Landlord - Properties'],
        parameters: [{ name: 'propertyId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Tenants retrieved' }
        }
      }
    },
    '/api/landlord/properties/settings': {
      get: {
        summary: 'Get property apartment settings',
        tags: ['Landlord - Properties'],
        responses: {
          '200': { description: 'Settings retrieved' }
        }
      },
      post: {
        summary: 'Create property apartment setting',
        tags: ['Landlord - Properties'],
        responses: {
          '201': { description: 'Setting created' }
        }
      }
    },

    // Landlord Tenants
    '/api/landlord/tenants': {
      get: {
        summary: 'Get all tenants under landlord',
        tags: ['Landlord - Tenants'],
        responses: {
          '200': { description: 'Tenants retrieved' }
        }
      }
    },
    '/api/landlord/tenants/{id}': {
      get: {
        summary: 'Get tenant by ID (landlord view)',
        tags: ['Landlord - Tenants'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Tenant retrieved' }
        }
      }
    },

    // Landlord Applications
    '/api/landlord/application': {
      get: {
        summary: 'Get applications for landlord properties',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Applications retrieved' }
        }
      }
    },
    '/api/landlord/application/{id}': {
      patch: {
        summary: 'Approve or reject a rental application',
        tags: ['Landlords'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Application status updated' }
        }
      }
    },

    // Landlord Maintenance
    '/api/landlord/maintenance': {
      get: {
        summary: 'Get maintenance requests for landlord properties',
        tags: ['Landlord - Maintenance'],
        responses: {
          '200': { description: 'Maintenance requests retrieved' }
        }
      }
    },
    '/api/landlord/maintenance/{id}': {
      patch: {
        summary: 'Update maintenance request status',
        tags: ['Landlord - Maintenance'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Maintenance request updated' }
        }
      }
    },

    // Landlord Inspections
    '/api/landlord/inspections': {
      get: {
        summary: 'Get inspections for landlord properties',
        tags: ['Landlord - Inspections'],
        responses: {
          '200': { description: 'Inspections retrieved' }
        }
      },
      post: {
        summary: 'Create a property inspection',
        tags: ['Landlord - Inspections'],
        responses: {
          '201': { description: 'Inspection created' }
        }
      }
    },
    '/api/landlord/inspections/{id}': {
      get: {
        summary: 'Get inspection by ID',
        tags: ['Landlord - Inspections'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Inspection retrieved' }
        }
      },
      patch: {
        summary: 'Update inspection',
        tags: ['Landlord - Inspections'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Inspection updated' }
        }
      }
    },

    // Landlord Bills
    '/api/landlord/bills': {
      get: {
        summary: 'Get bills for landlord',
        tags: ['Landlord - Bills'],
        responses: {
          '200': { description: 'Bills retrieved' }
        }
      },
      post: {
        summary: 'Create a bill for tenant',
        tags: ['Landlord - Bills'],
        responses: {
          '201': { description: 'Bill created' }
        }
      }
    },
    '/api/landlord/bills/{id}': {
      patch: {
        summary: 'Update a bill',
        tags: ['Landlord - Bills'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Bill updated' }
        }
      },
      delete: {
        summary: 'Delete a bill',
        tags: ['Landlord - Bills'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Bill deleted' }
        }
      }
    },

    // Landlord Finance & Transactions
    '/api/landlord/finance': {
      get: {
        summary: 'Get financial overview for landlord',
        tags: ['Landlord - Finance'],
        responses: {
          '200': { description: 'Finance overview retrieved' }
        }
      }
    },
    '/api/landlord/transactions': {
      get: {
        summary: 'Get transactions for landlord',
        tags: ['Landlord - Finance'],
        responses: {
          '200': { description: 'Transactions retrieved' }
        }
      }
    },
    '/api/landlord/payments': {
      get: {
        summary: 'Get payment records for landlord',
        tags: ['Landlord - Finance'],
        responses: {
          '200': { description: 'Payments retrieved' }
        }
      }
    },

    // Landlord Analytics & Reports
    '/api/landlord/analytics': {
      get: {
        summary: 'Get analytics for landlord',
        tags: ['Landlord - Analytics'],
        responses: {
          '200': { description: 'Analytics retrieved' }
        }
      }
    },
    '/api/landlord/reports': {
      get: {
        summary: 'Get reports for landlord',
        tags: ['Landlord - Analytics'],
        responses: {
          '200': { description: 'Reports retrieved' }
        }
      }
    },
    '/api/landlord/storage': {
      get: {
        summary: 'Get storage analytics for landlord',
        tags: ['Landlord - Analytics'],
        responses: {
          '200': { description: 'Storage analytics retrieved' }
        }
      }
    },

    // Landlord Violations
    '/api/landlord/violation': {
      get: {
        summary: 'Get violations for landlord properties',
        tags: ['Landlord - Violations'],
        responses: {
          '200': { description: 'Violations retrieved' }
        }
      },
      post: {
        summary: 'Create a violation notice',
        tags: ['Landlord - Violations'],
        responses: {
          '201': { description: 'Violation created' }
        }
      }
    },
    '/api/landlord/violation/{id}': {
      patch: {
        summary: 'Update a violation',
        tags: ['Landlord - Violations'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Violation updated' }
        }
      }
    },

    // Landlord Lease Renewals
    '/api/landlord/lease-renewals': {
      get: {
        summary: 'Get lease renewal requests for landlord',
        tags: ['Landlord - Lease'],
        responses: {
          '200': { description: 'Lease renewals retrieved' }
        }
      }
    },
    '/api/landlord/lease-renewals/{id}': {
      patch: {
        summary: 'Approve or reject a lease renewal',
        tags: ['Landlord - Lease'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Lease renewal updated' }
        }
      }
    },

    // Landlord Complaints
    '/api/landlord/complaints': {
      get: {
        summary: 'Get complaints for landlord properties',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Complaints retrieved' }
        }
      }
    },

    // Landlord Documents
    '/api/landlord/documents': {
      get: {
        summary: 'Get documents for landlord',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Documents retrieved' }
        }
      },
      post: {
        summary: 'Upload a document',
        tags: ['Landlords'],
        responses: {
          '201': { description: 'Document uploaded' }
        }
      }
    },

    // Landlord Tasks
    '/api/landlord/tasks': {
      get: {
        summary: 'Get tasks for landlord',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Tasks retrieved' }
        }
      },
      post: {
        summary: 'Create a task',
        tags: ['Landlords'],
        responses: {
          '201': { description: 'Task created' }
        }
      }
    },

    // Landlord Inventory
    '/api/landlord/inventory': {
      get: {
        summary: 'Get inventory for landlord',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Inventory retrieved' }
        }
      },
      post: {
        summary: 'Add inventory item',
        tags: ['Landlords'],
        responses: {
          '201': { description: 'Inventory item added' }
        }
      }
    },

    // Landlord Broadcast
    '/api/landlord/broadcast': {
      post: {
        summary: 'Broadcast a message to tenants',
        tags: ['Landlords'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string' },
                  propertyId: { type: 'string' },
                  targetGroup: { type: 'string', enum: ['ALL', 'PROPERTY', 'SPECIFIC'] }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Broadcast sent' }
        }
      }
    },

    // Landlord Events
    '/api/landlord/events': {
      get: {
        summary: 'Get events for landlord',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Events retrieved' }
        }
      },
      post: {
        summary: 'Create a landlord event',
        tags: ['Landlords'],
        responses: {
          '201': { description: 'Event created' }
        }
      }
    },

    // Landlord Property Values
    '/api/landlord/property-values': {
      get: {
        summary: 'Get property value analytics',
        tags: ['Landlord - Analytics'],
        responses: {
          '200': { description: 'Property values retrieved' }
        }
      }
    },

    // Landlord Supports
    '/api/landlord/supports': {
      get: {
        summary: 'Get support tickets for landlord',
        tags: ['Landlords'],
        responses: {
          '200': { description: 'Support tickets retrieved' }
        }
      },
      post: {
        summary: 'Create a support ticket',
        tags: ['Landlords'],
        responses: {
          '201': { description: 'Support ticket created' }
        }
      }
    },

    // ===================================================================
    // VENDOR ROUTES (/api/vendors/*)
    // Requires VENDOR role authentication
    // ===================================================================
    '/api/vendors/analytics': {
      get: {
        summary: 'Get vendor overview analytics',
        tags: ['Vendors'],
        responses: {
          '200': { description: 'Vendor analytics retrieved' }
        }
      }
    },
    '/api/vendors/reports': {
      get: {
        summary: 'Get vendor performance graphs/reports',
        tags: ['Vendors'],
        responses: {
          '200': { description: 'Vendor reports retrieved' }
        }
      }
    },
    '/api/vendors/events': {
      get: {
        summary: 'Get events assigned to vendor',
        tags: ['Vendors'],
        responses: {
          '200': { description: 'Vendor events retrieved' }
        }
      },
      post: {
        summary: 'Create a vendor event',
        tags: ['Vendors'],
        responses: {
          '201': { description: 'Event created' }
        }
      }
    },
    '/api/vendors/maintenance': {
      get: {
        summary: 'Get maintenance jobs assigned to vendor',
        tags: ['Vendors'],
        responses: {
          '200': { description: 'Maintenance jobs retrieved' }
        }
      }
    },
    '/api/vendors/maintenance/{id}': {
      patch: {
        summary: 'Update maintenance job status (vendor)',
        tags: ['Vendors'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Maintenance job updated' }
        }
      }
    },
    '/api/vendors/services': {
      get: {
        summary: 'Get services offered by vendor',
        tags: ['Vendors'],
        responses: {
          '200': { description: 'Vendor services retrieved' }
        }
      },
      post: {
        summary: 'Add a new service offering',
        tags: ['Vendors'],
        responses: {
          '201': { description: 'Service added' }
        }
      }
    },
    '/api/vendors/services/{id}': {
      patch: {
        summary: 'Update a vendor service',
        tags: ['Vendors'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Service updated' }
        }
      },
      delete: {
        summary: 'Delete a vendor service',
        tags: ['Vendors'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Service deleted' }
        }
      }
    },
  },
};

const expressPathFromRegexp = (regexp: RegExp): string => {
  let p = regexp.source;
  p = p.replace('^', '').replace('\\/?$', '').replace('(?=\\/|$)', '');
  p = p.replace(/\\\//g, '/').replace(/\(\?:\^\|\$\)/g, '');
  p = p.replace(/\$$/, '');
  return p;
};

const addPathToSwagger = (path: string, method: string) => {
  const normalized = path.startsWith('/') ? path : '/' + path;
  if (!swaggerSpec.paths[normalized]) swaggerSpec.paths[normalized] = {} as any;
  if (!swaggerSpec.paths[normalized][method.toLowerCase()]) {
    swaggerSpec.paths[normalized][method.toLowerCase()] = {
      summary: `Auto-generated stub for ${method} ${normalized}`,
      tags: ['Auto-generated'],
      responses: {
        '200': {
          description: 'Success',
        },
      },
    };
  }
};

const traverseStack = (stack: any[], prefix = '') => {
  stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      const routePath = `${prefix}${layer.route.path}`.replace(/\/\\+/g, '/');
      const methods = Object.keys(layer.route.methods);
      methods.forEach((method) => {
        addPathToSwagger(routePath, method.toUpperCase());
      });
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const subPath = layer.path || (layer.regexp ? expressPathFromRegexp(layer.regexp) : '');
      traverseStack(layer.handle.stack, `${prefix}${subPath}`);
    }
  });
};

export const attachExpressRoutesToSwagger = (app: any) => {
  if (!app || !app._router?.stack) return;
  traverseStack(app._router.stack);
};

export default swaggerSpec;
