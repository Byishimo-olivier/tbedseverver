import {
  BoQCategory,
  CompanyType,
  CompanyUserRole,
  Department,
  ExpenseCategory,
  InvoiceStatus,
  InvoiceType,
  PaymentTerms,
  PriorityLevel,
  ProjectType,
  ReportingPeriod,
  TenderDocumentType,
  TenderType,
  UnitOfMeasurement,
  UserRole,
} from "@/types/enums";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Construction Management API",
      version: "1.0.0",
      description: "API documentation for Construction Management System.",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.infrasoko.com"
            : "http://localhost:" + (process.env.PORT || "3000"),
        description:
          process.env.NODE_ENV === "production"
            ? "Production server"
            : "Local development server",
      },
      {
        url:
          process.env.NODE_ENV === "production"
            ? "http://localhost:" + (process.env.PORT || "3000")
            : "https://api.infrasoko.com",
        description:
          process.env.NODE_ENV === "production"
            ? "Local development server"
            : "Production server",
      },
    ],
    components: {
      schemas: {
        LoginDTO: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            password: {
              type: "string",
              example: "Password123!",
            },
            context: {
              type: "string",
              enum: ["individual", "company"],
              description: "Context for login, either 'user' or 'company'",
            },
          },
        },
        RegisterDTO: {
          type: "object",
          required: ["email", "password", "fullName", "role"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            password: {
              type: "string",
              minLength: 8,
              example: "Password123!",
              description:
                "Must contain uppercase, lowercase, number and special character",
            },
            fullName: {
              type: "string",
              minLength: 2,
              example: "John Doe",
            },
            role: { type: "string", enum: Object.values(UserRole) },
            profilePicture: {
              type: "string",
              format: "binary",
            },
          },
        },
        ForgotPasswordDTO: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
          },
        },
        ResetPasswordDTO: {
          type: "object",
          required: ["token", "newPassword"],
          properties: {
            token: {
              type: "string",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            newPassword: {
              type: "string",
              minLength: 8,
              example: "NewPassword123!",
              description:
                "Must contain uppercase, lowercase, number and special character",
            },
          },
        },
        SendVerificationDTO: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email" },
          },
        },
        Verify2FADTO: {
          type: "object",
          required: ["userId", "code"],
          properties: {
            userId: { type: "string" },
            code: { type: "string", minLength: 6, maxLength: 6 },
          },
        },
        CreateCompanyDTO: {
          type: "object",
          required: [
            "name",
            "registrationNumber",
            "type",
            "address",
            "email",
            "contactNumber",
          ],
          properties: {
            name: {
              type: "string",
              example: "Acme Construction Ltd",
            },
            registrationNumber: {
              type: "string",
              example: "REG12345678",
            },
            type: {
              type: "string",
              enum: Object.values(CompanyType),
              example: "Construction",
            },
            address: {
              type: "string",
              example: "123 Business Street, City",
            },
            email: {
              type: "string",
              format: "email",
              example: "info@acmeconstruction.com",
            },
            contactNumber: {
              type: "string",
              example: "+1234567890",
            },
            website: {
              type: "string",
              format: "url",
              example: "https://www.acmeconstruction.com",
            },
            experience: {
              type: "string",
              description: "A JSON string of the experience array. Example: '[{\"description\":\"Project A\",\"years\":5}]'",
            },
            certifications: {
              type: "string",
              description: "A JSON string of the certifications array. Example: '[{\"name\":\"ISO 9001\",\"issuingBody\":\"ISO\",\"issueDate\":\"2023-01-01T00:00:00.000Z\",\"expiryDate\":\"2025-01-01T00:00:00.000Z\"}]'",
            },
            experienceDocuments: {
              type: "array",
              items: {
                type: "string",
                format: "binary",
              },
              description: "Upload documents for each experience entry. The order must match the experience array.",
            },
            certificationDocuments: {
              type: "array",
              items: {
                type: "string",
                format: "binary",
              },
              description: "Upload documents for each certification entry. The order must match the certifications array.",
            },
          },
        },

        UpdateCompanyDTO: {
          type: "object",
          properties: {
            name: { type: "string" },
            registrationNumber: { type: "string" },
            type: { type: "string" },
            address: { type: "string" },
            email: { type: "string", format: "email" },
            contactNumber: { type: "string" },
            website: { type: "string", format: "url" },
            experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  years: { type: "number" },
                  documentProof: { type: "string", format: "binary" },
                },
              },
            },
            certifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  issuingBody: { type: "string" },
                  issueDate: { type: "string", format: "date-time" },
                  expiryDate: { type: "string", format: "date-time" },
                  documentProof: { type: "string", format: "binary" },
                },
              },
            },
          },
        },

        InviteCompanyMemberDTO: {
          // Add or ensure this DTO is present
          type: "object",
          required: ["companyId", "email", "role"],
          properties: {
            companyId: {
              type: "string",
              pattern: "^[0-9a-fA-F]{24}$",
              description: "The ID of the company to invite to.",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email of the user to invite.",
            },
            role: {
              type: "string",
              enum: Object.values(CompanyUserRole),
              description: "Role to assign to the invited user.",
            },
          },
        },

        UpdateCompanyMemberRoleDTO: {
          // Add or ensure this DTO is present
          type: "object",
          required: ["role"],
          properties: {
            role: {
              type: "string",
              enum: Object.values(CompanyUserRole),
              description: "The new role for the company member.",
            },
          },
        },

        RegisterWithInvitationDTO: {
          type: "object",
          required: ["email", "password", "fullName", "invitationToken"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            password: {
              type: "string",
              minLength: 8,
              example: "Password123!",
              description:
                "Must contain uppercase, lowercase, number and special character",
            },
            fullName: {
              type: "string",
              minLength: 2,
              example: "John Doe",
            },
            invitationToken: {
              type: "string",
              description: "Project invitation token",
            },
            companyInvitationToken: {
              type: "string",
              description: "Company invitation token (optional)",
            },
          },
        },

        RegisterWithCompanyInvitationDTO: {
          type: "object",
          required: ["email", "password", "fullName", "companyInvitationToken"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            password: {
              type: "string",
              minLength: 8,
              example: "Password123!",
              description:
                "Must contain uppercase, lowercase, number and special character",
            },
            fullName: {
              type: "string",
              minLength: 2,
              example: "John Doe",
            },
            companyInvitationToken: {
              type: "string",
              description: "Company invitation token",
            },
          },
        },

        CompanyDTO: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "507f1f77bcf86cd799439011",
            },
            name: {
              type: "string",
              example: "Acme Construction Ltd",
            },
            businessType: {
              type: "string",
              example: "Limited Company",
            },
            registrationNumber: {
              type: "string",
              example: "REG123456",
            },
            address: {
              type: "string",
              example: "123 Business Avenue, Suite 500",
            },
            logo: {
              type: "string",
              example: "uploads/1234567890-company-logo.jpg",
            },
            members: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  userId: {
                    type: "string",
                    pattern: "^[0-9a-fA-F]{24}$",
                  },
                  role: {
                    type: "string",
                    enum: ["OWNER", "ADMIN", "MEMBER", "ACCOUNTANT"],
                  },
                  permissions: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                  joinedAt: {
                    type: "string",
                    format: "date-time",
                  },
                },
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        CreateProjectDTO: {
          type: "object",
          required: ["name", "projectDescription", "status", "type", "budget"],
          properties: {
            name: { type: "string", minLength: 2 },
            projectCode: { type: "string" },
            projectDescription: { type: "string", minLength: 10 },
            status: { type: "string" },
            type: { type: "string", enum: Object.values(ProjectType) },
            team: {
              type: "object",
              properties: {
                contractor: {
                  type: "array",
                  items: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
                },
                consultant: {
                  type: "array",
                  items: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
                },
              },
            },
            progress: { type: "number", minimum: 0, maximum: 100 },
            budget: { type: "number", minimum: 0 },
            file: { type: "string", format: "binary" },
            description: { type: "string" },
          },
        },
        CreateInvitationDTO: {
          type: "object",
          required: ["projectId", "email", "role"],
          properties: {
            projectId: {
              type: "string",
              pattern: "^[0-9a-fA-F]{24}$",
              description: "MongoDB ObjectId of the project",
            },
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            role: {
              type: "string",
              enum: ["CONTRACTOR", "CONSULTANT"],
              description: "Role to assign to the invited user",
            },
          },
        },
        UpdateProjectDTO: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2 },
            projectDescription: { type: "string", minLength: 10 },
            status: { type: "string" },
            type: { type: "string", enum: Object.values(ProjectType) },
            team: {
              type: "object",
              properties: {
                contractor: {
                  type: "array",
                  items: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
                },
                consultant: {
                  type: "array",
                  items: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
                },
              },
            },
            progress: { type: "number", minimum: 0, maximum: 100 },
            budget: { type: "number", minimum: 0 },
            file: { type: "string", format: "binary" },
            description: { type: "string" },
          },
        },
        UploadProjectDocumentDTO: {
          type: "object",
          required: ["file", "description"],
          properties: {
            file: {
              type: "string",
              format: "binary",
            },
            description: {
              type: "string",
            },
          },
        },
        CreateMaterialRequestDTO: {
          type: "object",
          required: [
            "projectId",
            "requesterName",
            "department",
            "materialDetails",
            "purpose",
            "priorityLevel",
          ],
          properties: {
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            requesterName: { type: "string", minLength: 2 },
            department: { type: "string", enum: Object.values(Department) },
            requestDate: {
              type: "string",
              format: "date-time",
              example: "2025-01-28T14:30:00.000Z",
            },
            materialDetails: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "materialName",
                  "quantity",
                  "unit",
                  "requiredByDate",
                  "estimatedCost",
                  "category",
                ],
                properties: {
                  materialName: { type: "string", minLength: 1 },
                  quantity: { type: "number", minimum: 1 },
                  unit: {
                    type: "string",
                    enum: Object.values(UnitOfMeasurement),
                  },
                  requiredByDate: {
                    type: "string",
                    format: "date-time",
                    example: "2025-02-15T00:00:00.000Z",
                  },
                  specifications: { type: "string" },
                  estimatedCost: { type: "number", minimum: 0 },
                  category: {
                    type: "string",
                    enum: Object.values(ExpenseCategory),
                  },
                },
              },
            },
            purpose: { type: "string", minLength: 5 },
            priorityLevel: {
              type: "string",
              enum: Object.values(PriorityLevel),
            },
          },
        },

        CreatePurchaseOrderDTO: {
          type: "object",
          required: [
            "projectId",
            "poNumber",
            "supplierDetails",
            "deliveryDate",
            "materialList",
            "totalCost",
            "paymentTerms",
          ],
          properties: {
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            materialRequestId: {
              type: "string",
              pattern: "^[0-9a-fA-F]{24}$",
              description:
                "Optional ID of a material request to create the PO from.",
            },
            poNumber: { type: "string", minLength: 1 },
            supplierDetails: { type: "string", minLength: 2 },
            orderDate: {
              type: "string",
              format: "date-time",
              example: "2025-01-28T00:00:00.000Z",
            },
            deliveryDate: {
              type: "string",
              format: "date-time",
              example: "2025-02-15T00:00:00.000Z",
            },
            materialList: {
              type: "array",
              items: {
                type: "object",
                description:
                "Required if not creating from a material request ID.",
                required: [
                  "materialName",
                  "quantity",
                  "unit",
                  "category",
                  "unitPrice",
                ],
                properties: {
                  materialName: { type: "string", minLength: 1 },
                  quantity: { type: "number", minimum: 1 },
                  unit: {
                    type: "string",
                    enum: Object.values(UnitOfMeasurement),
                  },
                  category: {
                    type: "string",
                    enum: Object.values(ExpenseCategory),
                  },
                  unitPrice: { type: "number", minimum: 0 },
                },
              },
            },
            totalCost: { type: "number", minimum: 0 },
            paymentTerms: { type: "string", enum: Object.values(PaymentTerms) },
            specialInstructions: { type: "string" },
            notificationTime: {
              type: "string",
              format: "date-time",
              example: "2025-01-28T00:00:00.000Z",
            },
            expenseRecorded: { type: "boolean" },
            fileDescription: {
              type: "string",
              description: "Description for the uploaded file",
            },
            file: { type: "string", format: "binary" },
          },
        },
         // Add to schemas section
        ProgressDocumentDTO: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Description of the document",
            },
          },
        },
        CreateProgressTrackingDTO: {
          type: "object",
          required: ["projectId", "reportingPeriod", "stageProgress"],
          properties: {
            projectId: { type: "string" },
            reportingPeriod: {
              type: "string",
              enum: ["daily", "weekly", "monthly"],
            },
            stageProgress: {
              type: "string",
              description: "JSON string of stage progress array",
            },
            comments: { type: "string" },
            supportingDocumentation: {
              type: "string",
              description: "JSON array of {description} objects",
            },
            delayDocumentation: {
              type: "string",
              description: "JSON array of {description} objects",
            },
            "supportingDocumentation[0][file]": {
              type: "string",
              format: "binary",
              description: "Supporting document file 1",
            },
            "supportingDocumentation[1][file]": {
              type: "string",
              format: "binary",
              description: "Supporting document file 2",
            },
            "supportingDocumentation[2][file]": {
              type: "string",
              format: "binary",
              description: "Supporting document file 3",
            },
            "delayDocumentation[0][file]": {
              type: "string",
              format: "binary",
              description: "Delay document file 1",
            },
            "delayDocumentation[1][file]": {
              type: "string",
              format: "binary",
              description: "Delay document file 2",
            },
            "delayDocumentation[2][file]": {
              type: "string",
              format: "binary",
              description: "Delay document file 3",
            },
            correctiveActions: {
              type: "string",
              description: "JSON array of corrective action strings",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "507f1f77bcf86cd799439011",
            },
            fullName: {
              type: "string",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            role: {
              type: "string",
              enum: ["admin", "user"],
              example: "user",
            },
            isEmailVerified: {
              type: "boolean",
              example: false,
            },
            profilePicture: {
              type: "string",
              nullable: true,
              example: "uploads/1234567890-profile.jpg",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        CreateBudgetDTO: {
          type: "object",
          required: [
            "projectId",
            "fiscalYear",
            "materialsBudget",
            "laborBudget",
            "equipmentBudget",
            "fuelBudget",
            "overheadsBudget",
          ],
          properties: {
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            fiscalYear: { type: "number", minimum: 2000 },
            materialsBudget: { type: "number", minimum: 0 },
            laborBudget: { type: "number", minimum: 0 },
            equipmentBudget: { type: "number", minimum: 0 },
            fuelBudget: { type: "number", minimum: 0 },
            overheadsBudget: { type: "number", minimum: 0 },
            notes: { type: "string" },
          },
        },

        CreateExpenseDTO: {
          type: "object",
          required: ["projectId", "date", "category", "amount", "description"],
          properties: {
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            date: { type: "string", format: "date-time" },
            category: {
              type: "string",
              enum: Object.values(ExpenseCategory),
            },
            amount: { type: "number", minimum: 0 },
            description: { type: "string" },
            document: { type: "string", format: "binary" },
          },
        },

        CreateInvoiceDTO: {
          type: "object",
          required: [
            "type",
            "projectId",
            "workPeriod",
            "invoiceItems",
            "paymentTerms",
            "dueDate",
            "paymentDetails",
          ],
          properties: {
            type: { type: "string", enum: Object.values(InvoiceType) },
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            workPeriod: {
              type: "object",
              required: ["start", "end"],
              properties: {
                start: { type: "string", format: "date-time" },
                end: { type: "string", format: "date-time" },
              },
            },
            invoiceItems: {
              type: "array",
              items: {
                type: "object",
                required: ["boqItemId", "claimedQuantity"],
                properties: {
                  boqItemId: {
                    type: "string",
                    pattern: "^[0-9a-fA-F]{24}$",
                  },
                  claimedQuantity: { type: "number", minimum: 0.01 },
                },
              },
            },
            paymentTerms: { type: "string", enum: Object.values(PaymentTerms) },
            dueDate: { type: "string", format: "date-time" },
            paymentDetails: {
              type: "object",
              required: ["bankName", "accountNumber", "accountName"],
              properties: {
                bankName: { type: "string" },
                accountNumber: { type: "string" },
                accountName: { type: "string" },
              },
            },
            documents: {
              type: "array",
              items: { type: "string", format: "binary" },
              description: "Supporting documents for the invoice.",
            },
          },
        },

        UpdateInvoiceStatusDTO: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: Object.values(InvoiceStatus),
            },
          },
        },

        BudgetSummaryResponse: {
          type: "object",
          properties: {
            budget: {
              type: "object",
              properties: {
                totalPlanned: { type: "number" },
                materials: { type: "number" },
                labor: { type: "number" },
                equipment: { type: "number" },
                fuel: { type: "number" },
                overheads: { type: "number" },
              },
            },
            expenses: {
              type: "object",
              properties: {
                total: { type: "number" },
                byCategory: {
                  type: "object",
                  properties: {
                    materials: { type: "number" },
                    labor: { type: "number" },
                    equipment: { type: "number" },
                    fuel: { type: "number" },
                    overheads: { type: "number" },
                  },
                },
              },
            },
            remaining: { type: "number" },
            utilizationPercentage: { type: "number" },
          },
        },
BoQLineItem: {
          type: "object",
          properties: {
            _id: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            description: { type: "string" },
            unit: { type: "string", enum: Object.values(UnitOfMeasurement) },
            quantity: { type: "number" },
            rate: { type: "number" },
            amount: { type: "number" },
            completedQuantity: { type: "number" },
          },
        },
        BoQSection: {
          type: "object",
          properties: {
            _id: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            sectionName: { type: "string", enum: Object.values(BoQCategory) },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/BoQLineItem" },
            },
            subTotal: { type: "number" },
          },
        },
        BoQ: {
          type: "object",
          properties: {
            _id: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            projectName: { type: "string" },
            sections: {
              type: "array",
              items: { $ref: "#/components/schemas/BoQSection" },
            },
            grandTotal: { type: "number" },
            createdBy: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            updatedBy: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateOrUpdateBoQDTO: {
          type: "object",
          required: ["projectId", "projectName", "sections"],
          properties: {
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            projectName: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                required: ["sectionName", "items"],
                properties: {
                  sectionName: {
                    type: "string",
                    enum: Object.values(BoQCategory),
                  },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["description", "unit", "quantity", "rate"],
                      properties: {
                        description: { type: "string" },
                        unit: {
                          type: "string",
                          enum: Object.values(UnitOfMeasurement),
                        },
                        quantity: { type: "number" },
                        rate: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        CreateInventoryItemDTO: {
          type: "object",
          required: ["name", "unit", "category", "unitPrice"],
          properties: {
            materialCode: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            unit: { type: "string", enum: Object.values(UnitOfMeasurement) },
            category: {
              type: "string",
              enum: Object.values(ExpenseCategory),
            },
            unitPrice: { type: "number", minimum: 0 },
            minimumStock: { type: "number", minimum: 0 },
          },
        },

        CreateGRNDTO: {
          type: "object",
          required: ["projectId", "purchaseOrderId", "receivedDate", "items"],
          properties: {
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            purchaseOrderId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            receivedDate: { type: "string", format: "date-time" },
            items: {
              type: "array",
              items: {
                type: "object",
                required: ["materialId", "quantity", "receivedQuantity"],
                properties: {
                  materialId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
                  quantity: { type: "number", minimum: 0 },
                  receivedQuantity: { type: "number", minimum: 0 },
                  remarks: { type: "string" },
                },
              },
            },
            documents: {
              type: "array",
              items: { type: "string", format: "binary" },
            },
          },
        },

        CreateMaterialUsageDTO: {
          type: "object",
          required: ["projectId", "date", "reportingPeriod", "items"],
          properties: {
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            date: { type: "string", format: "date-time" },
            reportingPeriod: {
              type: "string",
              enum: Object.values(ReportingPeriod),
            },
            items: {
              type: "array",
              items: {
                type: "object",
                required: ["materialId", "quantity", "location", "purpose"],
                properties: {
                  materialId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
                  quantity: { type: "number", minimum: 0 },
                  location: { type: "string" },
                  purpose: { type: "string" },
                },
              },
            },
          },
        },
        FinanceReportDTO: {
          type: "object",
          properties: {
            projectName: { type: "string" },
            projectCode: { type: "string" },
            fiscalYear: { type: "number" },
            generatedDate: { type: "string", format: "date-time" },
            categoryDetails: {
              type: "object",
              additionalProperties: {
                type: "object",
                properties: {
                  planned: { type: "number" },
                  actual: { type: "number" },
                  difference: { type: "number" },
                  percentageUsed: { type: "number" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        amount: { type: "number" },
                        date: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
            summary: {
              type: "object",
              properties: {
                totalBudget: { type: "number" },
                totalExpenses: { type: "number" },
                totalRemaining: { type: "number" },
                utilizationPercentage: { type: "number" },
                status: {
                  type: "string",
                  enum: ["Within Budget", "Over Budget"],
                },
              },
            },
          },
        },

        BudgetThresholdDTO: {
          type: "object",
          properties: {
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            thresholds: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  level: { type: "number", minimum: 0, maximum: 100 },
                  emailTemplate: { type: "string" },
                },
              },
            },
          },
        },
        UpdateUserDTO: {
          type: "object",
          properties: {
            fullName: { type: "string", minLength: 2 },
            companyName: { type: "string", minLength: 2 },
            contactNumber: { type: "string", minLength: 10 },
            department: { type: "string", enum: Object.values(Department) },
            profilePicture: { type: "string", format: "uri" },
          },
        },
        TenderDocument: {
          type: "object",
          properties: {
            filePath: { type: "string" },
            description: { type: "string" },
            documentType: { type: "string", enum: Object.values(TenderDocumentType) },
          },
        },
        TenderEligibilityCriteria: {
          type: "object",
          properties: {
            minimumExperience: { type: "number", description: "Minimum years of experience" },
            minimumTurnover: { type: "number", description: "Minimum annual turnover" },
            requiredLicenses: { type: "array", items: { type: "string" } },
            requiredCertifications: { type: "array", items: { type: "string" } },
            geographicalRestrictions: { type: "array", items: { type: "string" } },
          },
        },
        CreateTenderDTO: {
          type: "object",
          required: ["projectId", "title", "description", "type", "clarificationDeadline", "submissionDeadline", "bidOpeningDate", "eligibilityCriteria", "tenderManager"],
          properties: {
            projectId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            title: { type: "string", minLength: 5 },
            description: { type: "string", minLength: 10 },
            type: { type: "string", enum: Object.values(TenderType) },
            clarificationDeadline: { type: "string", format: "date-time" },
            submissionDeadline: { type: "string", format: "date-time" },
            bidOpeningDate: { type: "string", format: "date-time" },
            eligibilityCriteria: { $ref: '#/components/schemas/TenderEligibilityCriteria' },
            tenderManager: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            evaluationCommittee: { type: "array", items: { type: "string", pattern: "^[0-9a-fA-F]{24}$" } },
            boqId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            estimatedBudget: { type: "number", minimum: 0 },
            documents: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  documentType: { 
                    type: "string", 
                    enum: Object.values(TenderDocumentType),
                    description: "Type of document being uploaded"
                  },
                  description: { 
                    type: "string",
                    description: "Description of the document"
                  }
                }
              },
              description: "Array of tender documents metadata"
            },
            "documents[0][file]": {
              type: "string",
              format: "binary",
              description: "Tender document file 1"
            },
            "documents[1][file]": {
              type: "string",
              format: "binary",
              description: "Tender document file 2"
            },
            "documents[2][file]": {
              type: "string",
              format: "binary",
              description: "Tender document file 3"
            },
            "documents[3][file]": {
              type: "string",
              format: "binary",
              description: "Tender document file 4"
            },
            "documents[4][file]": {
              type: "string",
              format: "binary",
              description: "Tender document file 5"
            }
          },
        },
        RegisterBidderDTO: {
          type: "object",
          required: ["taxId", "contactPerson", "contactEmail", "contactPhone", "annualTurnover", "bankName", "bankAccountNumber"],
          properties: {
            companyId: { 
              type: "string", 
              pattern: "^[0-9a-fA-F]{24}$",
              description: "Optional ID of an existing company. If provided, company details will be pre-filled."
            },
            companyName: { 
              type: "string",
              description: "Required if companyId is not provided."
            },
            companyType: { 
              type: "string", 
              enum: Object.values(CompanyType),
              description: "Required if companyId is not provided."
            },
            registrationNumber: { 
              type: "string",
              description: "Required if companyId is not provided."
            },
            taxId: { type: "string" },
            contactPerson: { type: "string" },
            contactEmail: { type: "string", format: "email" },
            contactPhone: { type: "string" },
            address: {
              type: "object",
              description: "Required if companyId is not provided.",
              properties: {
                street: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                postalCode: { type: "string" },
                country: { type: "string" },
              },
            },
            annualTurnover: { type: "number", minimum: 0 },
            bankName: { type: "string" },
            bankAccountNumber: { type: "string" },
            qualifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          certificationType: { type: "string" },
          certificateNumber: { type: "string" },
          issuingAuthority: { type: "string" },
          issueDate: { type: "string", format: "date-time" },
          expiryDate: { type: "string", format: "date-time" },
          description: { type: "string" }
        }
      }
    },
    profileDocuments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          documentType: { 
            type: "string", 
            enum: ["COMPANY_PROFILE", "FINANCIAL_STATEMENT", "REGISTRATION_CERT", "TAX_CERT", "OTHER"]
          },
          description: { type: "string" }
        }
      }
    },
    "qualifications[0][file]": {
      type: "string",
      format: "binary",
      description: "Qualification certificate file"
    },
    "profileDocuments[0][file]": {
      type: "string",
      format: "binary", 
      description: "Profile document file"
    }
          },
        },
        PricedBoQItemDTO: {
          type: "object",
          required: ["boqItemId", "unitRate"],
          properties: {
            boqItemId: { type: "string", pattern: "^[0-9a-fA-F]{24}$", description: "ID of the BoQ item from the tender" },
            unitRate: { type: "number", minimum: 0, description: "The bidder's unit rate for this item" }
          }
        },
        ManualBoQItemDTO: {
          type: "object",
          required: ["description", "unit", "quantity", "unitRate"],
          properties: {
            description: { type: "string", description: "Description of the BoQ item" },
            unit: { type: "string", enum: Object.values(UnitOfMeasurement), description: "Unit of measurement" },
            quantity: { type: "number", minimum: 0, description: "Quantity of the item" },
            unitRate: { type: "number", minimum: 0, description: "The bidder's unit rate for this item" }
          }
        },
        FinancialDocumentDTO: {
          type: "object",
          required: ["filePath", "documentType"],
          properties: {
            filePath: { type: "string" },
            description: { type: "string" },
            documentType: { type: "string", enum: ["BOQ", "PRICE_BREAKDOWN", "CASH_FLOW", "BOND", "OTHER"] }
          }
        },
        SubmitBidDTO: {
          type: "object",
          required: ["tenderId", "technicalProposal", "financialProposal"],
          properties: {
            tenderId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            technicalProposal: {
              type: "object",
              required: ["methodology", "workPlan", "teamStructure", "equipmentList", "projectSchedule"],
              properties: {
                methodology: { type: "string" },
                workPlan: { type: "string" },
                teamStructure: { type: "string" },
                equipmentList: { type: "string" },
                projectSchedule: { type: "string" },
                documents: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      documentType: { 
                        type: "string", 
                        enum: ["METHODOLOGY", "WORK_PLAN", "TEAM_CV", "EQUIPMENT", "SCHEDULE", "OTHER"] 
                      },
                      description: { type: "string" },
                      file: { type: "string", format: "binary" }
                    }
                  }
                }
              },
            },
            financialProposal: {
              type: "object",
              required: ["totalBidPrice", "priceBreakdown"],
              description: "Must contain one of: pricedBoqItems, manualBoqItems, or a document of type BOQ.",
              properties: {
                totalBidPrice: { type: "number", minimum: 0 },
                pricedBoqItems: {
                  type: "array",
                  items: { $ref: '#/components/schemas/PricedBoQItemDTO' },
                  description: "Use when pricing a BoQ provided with the tender."
                },
                manualBoqItems: {
                  type: "array",
                  items: { $ref: '#/components/schemas/ManualBoQItemDTO' },
                  description: "Use when manually providing BoQ items."
                },
                priceBreakdown: {
                  type: "object",
                  required: ["materials", "labor", "equipment", "overheads", "profit"],
                  properties: {
                    materials: { type: "number", minimum: 0 },
                    labor: { type: "number", minimum: 0 },
                    equipment: { type: "number", minimum: 0 },
                    overheads: { type: "number", minimum: 0 },
                    profit: { type: "number", minimum: 0 },
                  }
                },
                documents: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      documentType: { 
                        type: "string", 
                        enum: ["BOQ", "PRICE_BREAKDOWN", "CASH_FLOW", "BOND", "OTHER"] 
                      },
                      description: { type: "string" },
                      file: { type: "string", format: "binary" }
                    }
                  },
                  description: "Use to upload a BoQ document or other financial documents."
                }
              },
            },
            otherDocuments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  documentType: { type: "string" },
                  description: { type: "string" },
                  file: { type: "string", format: "binary" }
                }
              },
              description: "Additional supporting documents"
            }
          },
        },
        AskClarificationDTO: {
          type: "object",
          required: ["tenderId", "question"],
          properties: {
            tenderId: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
            question: { type: "string", minLength: 10 },
          },
        },
        AnswerClarificationDTO: {
          type: "object",
          required: ["response"],
          properties: {
            response: { type: "string", minLength: 10 },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              description: "Error message",
            },
            error: {
              type: "string",
              description: "Detailed error information",
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Authentication failed",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        ForbiddenError: {
          description:
            "Access denied. You do not have permission to perform this action.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        ValidationError: {
          description: "Validation failed",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Validation error",
                  },
                  error: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        example: "VALIDATION",
                      },
                      details: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            path: {
                              type: "string",
                              example: "password",
                            },
                            message: {
                              type: "string",
                              example: "Password must be at least 8 characters",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
