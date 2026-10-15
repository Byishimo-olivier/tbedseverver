import { Request, Response, NextFunction } from "express";
import { AppError, ErrorType } from "../utils/exceptions";
import { logger } from "../utils/logger";

interface ParseError {
  field: string;
  value: any;
  error: string;
}

export const parseProjectData = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const errors: ParseError[] = [];

    // Parse MongoDB ObjectId fields - trim whitespace
    const objectIdFields = ["projectId", "materialRequestId"];
    for (const field of objectIdFields) {
      if (req.body[field]) {
        req.body[field] = req.body[field].trim();
      }
    }

    // Parse "team"
    if (req.body.team) {
      try {
        if (typeof req.body.team === "string") {
          // Handle empty string - treat as undefined (optional field)
          if (req.body.team.trim() === "") {
            delete req.body.team;
          } else {
            req.body.team = JSON.parse(req.body.team);
          }
        }
      } catch (e) {
        errors.push({
          field: "team",
          value: req.body.team,
          error: "Invalid team data format. Expected valid JSON object",
        });
      }
    }

    // Parse "organizationDetails"
    if (req.body.organizationDetails) {
      let parsedDetails: any;

      // If it's a string, try to parse it
      if (typeof req.body.organizationDetails === "string") {
        try {
          parsedDetails = JSON.parse(req.body.organizationDetails);
        } catch (e) {
          errors.push({
            field: "organizationDetails",
            value: req.body.organizationDetails,
            error:
              "Invalid organization details format. Expected valid JSON object",
          });
        }
      } else {
        // Already an object
        parsedDetails = req.body.organizationDetails;
      }

      // Now convert object back to string if the Mongoose schema expects a string
      if (parsedDetails && typeof parsedDetails === "object") {
        req.body.organizationDetails = JSON.stringify(parsedDetails);
      }
    }

    // Parse "materialList"
    if (req.body.materialList) {
      try {
        if (typeof req.body.materialList === "string") {
          req.body.materialList = JSON.parse(req.body.materialList);
        }

        // Convert object to array if it's a non-array object
        if (
          typeof req.body.materialList === "object" &&
          !Array.isArray(req.body.materialList)
        ) {
          const materialValues = Object.values(req.body.materialList);
          if (materialValues.length > 0) {
            req.body.materialList = materialValues;
          } else {
            errors.push({
              field: "materialList",
              value: req.body.materialList,
              error: "Material list cannot be empty",
            });
          }
        }

        // Final check: make sure materialList is an array
        if (!Array.isArray(req.body.materialList)) {
          errors.push({
            field: "materialList",
            value: req.body.materialList,
            error: "Material list must be an array",
          });
        }
      } catch (e) {
        errors.push({
          field: "materialList",
          value: req.body.materialList,
          error: "Invalid material list format. Expected valid JSON array",
        });
      }
    }

    // Convert numeric fields
    const numericFields = ["progress", "budget", "totalCost", "quantity"];
    for (const field of numericFields) {
      if (req.body[field]) {
        const value = Number(req.body[field]);
        if (isNaN(value)) {
          errors.push({
            field,
            value: req.body[field],
            error: `${field} must be a valid number`,
          });
        } else {
          req.body[field] = value;
        }
      }
    }

    if (errors.length > 0) {
      logger.error("Parsing errors:", { errors });
      throw new AppError(
        "Error parsing request data",
        400,
        ErrorType.PARSING,
        errors
      );
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    logger.error("Unexpected parsing error:", error);
    next(
      new AppError(
        "Failed to parse request data",
        400,
        ErrorType.PARSING,
        process.env.NODE_ENV === "development" ? error : undefined
      )
    );
  }
};

export function parseItemsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const errors: ParseError[] = [];

    if (req.body.financialProposal) {
      console.log("Raw financialProposal:", typeof req.body.financialProposal, req.body.financialProposal);
    }

        // Parse stageProgress for progress tracking
    if (req.body.stageProgress && typeof req.body.stageProgress === "string") {
      try {
        req.body.stageProgress = JSON.parse(req.body.stageProgress);
      } catch (err) {
        errors.push({
          field: "stageProgress",
          value: req.body.stageProgress,
          error: "Invalid JSON format for stageProgress"
        });
      }
    }

    // Parse supportingDocumentation for progress tracking
    if (req.body.supportingDocumentation && typeof req.body.supportingDocumentation === "string") {
      try {
        req.body.supportingDocumentation = JSON.parse(req.body.supportingDocumentation);
      } catch (err) {
        errors.push({
          field: "supportingDocumentation",
          value: req.body.supportingDocumentation,
          error: "Invalid JSON format for supportingDocumentation"
        });
      }
    }

    // Parse delayDocumentation for progress tracking
    if (req.body.delayDocumentation && typeof req.body.delayDocumentation === "string") {
      try {
        req.body.delayDocumentation = JSON.parse(req.body.delayDocumentation);
      } catch (err) {
        errors.push({
          field: "delayDocumentation",
          value: req.body.delayDocumentation,
          error: "Invalid JSON format for delayDocumentation"
        });
      }
    }

    // Parse correctiveActions for progress tracking
    if (req.body.correctiveActions && typeof req.body.correctiveActions === "string") {
      try {
        req.body.correctiveActions = JSON.parse(req.body.correctiveActions);
      } catch (err) {
        errors.push({
          field: "correctiveActions",
          value: req.body.correctiveActions,
          error: "Invalid JSON format for correctiveActions"
        });
      }
    }

    // Parse financial proposal for bid submission
    if (req.body.financialProposal && typeof req.body.financialProposal === "string") {
      try {
        req.body.financialProposal = JSON.parse(req.body.financialProposal);
      } catch (err) {
        errors.push({
          field: "financialProposal",
          value: req.body.financialProposal,
          error: "Invalid JSON format for financialProposal"
        });
      }
    }
    // Handle case where financialProposal is an object with empty key containing the actual data
    else if (req.body.financialProposal && typeof req.body.financialProposal === "object") {
      // Check if there's an empty key with the actual data
      if (req.body.financialProposal[""] && typeof req.body.financialProposal[""] === "string") {
        try {
          const parsedData = JSON.parse(req.body.financialProposal[""]);
          // Preserve existing properties (like documents) and merge with parsed data
          const { "": emptyKey, ...otherProps } = req.body.financialProposal;
          req.body.financialProposal = {
            ...parsedData,
            ...otherProps
          };
        } catch (err) {
          errors.push({
            field: "financialProposal",
            value: req.body.financialProposal[""],
            error: "Invalid JSON format for financialProposal"
          });
        }
      }
      // Check for other malformed structures
      else if (!req.body.financialProposal.totalBidPrice && !req.body.financialProposal.priceBreakdown) {
        // Look for the actual data in any string value
        const stringValues = Object.values(req.body.financialProposal).filter(val => typeof val === "string");
        if (stringValues.length > 0) {
          try {
            const parsedData = JSON.parse(stringValues[0] as string);
            // Preserve non-string properties and merge with parsed data
            const nonStringProps = Object.fromEntries(
              Object.entries(req.body.financialProposal).filter(([_key, val]) => typeof val !== "string")
            );
            req.body.financialProposal = {
              ...parsedData,
              ...nonStringProps
            };
          } catch (err) {
            errors.push({
              field: "financialProposal",
              value: stringValues[0],
              error: "Invalid JSON format for financialProposal"
            });
          }
        }
      }
    }

    // Parse basic items field (existing functionality)
    if (req.body.items && typeof req.body.items === "string") {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch (err) {
        errors.push({
          field: "items",
          value: req.body.items,
          error: "Invalid JSON format for items"
        });
      }
    }

    // Parse eligibilityCriteria for tender creation
    if (req.body.eligibilityCriteria && typeof req.body.eligibilityCriteria === "string") {
      try {
        req.body.eligibilityCriteria = JSON.parse(req.body.eligibilityCriteria);
      } catch (err) {
        errors.push({
          field: "eligibilityCriteria",
          value: req.body.eligibilityCriteria,
          error: "Invalid JSON format for eligibilityCriteria"
        });
      }
    }

    // Parse evaluationCommittee for tender creation
    if (req.body.evaluationCommittee && typeof req.body.evaluationCommittee === "string") {
      try {
        req.body.evaluationCommittee = JSON.parse(req.body.evaluationCommittee);
      } catch (err) {
        // If parsing fails, try to handle as comma-separated string
        if (req.body.evaluationCommittee.includes(',')) {
          req.body.evaluationCommittee = req.body.evaluationCommittee.split(',').map((id: string) => id.trim());
        } else {
          req.body.evaluationCommittee = [];
        }
      }
    }

    // Parse documents array for tender creation
    if (req.body.documents && typeof req.body.documents === "string") {
      try {
        req.body.documents = JSON.parse(req.body.documents);
      } catch (err) {
        errors.push({
          field: "documents",
          value: req.body.documents,
          error: "Invalid JSON format for documents"
        });
      }
    }

    // Parse technical proposal for bid submission
    if (req.body.technicalProposal && typeof req.body.technicalProposal === "string") {
      try {
        req.body.technicalProposal = JSON.parse(req.body.technicalProposal);
      } catch (err) {
        errors.push({
          field: "technicalProposal",
          value: req.body.technicalProposal,
          error: "Invalid JSON format for technicalProposal"
        });
      }
    }
    // Handle case where technicalProposal might have similar issues
    else if (req.body.technicalProposal && typeof req.body.technicalProposal === "object") {
      if (req.body.technicalProposal[""] && typeof req.body.technicalProposal[""] === "string") {
        try {
          const parsedData = JSON.parse(req.body.technicalProposal[""]);
          const { "": emptyKey, ...otherProps } = req.body.technicalProposal;
          req.body.technicalProposal = {
            ...parsedData,
            ...otherProps
          };
        } catch (err) {
          errors.push({
            field: "technicalProposal",
            value: req.body.technicalProposal[""],
            error: "Invalid JSON format for technicalProposal"
          });
        }
      }
    }

    // Parse technical proposal documents
    if (req.body.technicalProposal?.documents && typeof req.body.technicalProposal.documents === "string") {
      try {
        req.body.technicalProposal.documents = JSON.parse(req.body.technicalProposal.documents);
      } catch (err) {
        errors.push({
          field: "technicalProposal.documents",
          value: req.body.technicalProposal.documents,
          error: "Invalid JSON format for technical proposal documents"
        });
      }
    }

    // Parse financial proposal nested fields
    if (req.body.financialProposal) {
      // Parse pricedBoqItems
      if (req.body.financialProposal.pricedBoqItems && typeof req.body.financialProposal.pricedBoqItems === "string") {
        try {
          req.body.financialProposal.pricedBoqItems = JSON.parse(req.body.financialProposal.pricedBoqItems);
        } catch (err) {
          errors.push({
            field: "financialProposal.pricedBoqItems",
            value: req.body.financialProposal.pricedBoqItems,
            error: "Invalid JSON format for pricedBoqItems"
          });
        }
      }

      // Parse manualBoqItems
      if (req.body.financialProposal.manualBoqItems && typeof req.body.financialProposal.manualBoqItems === "string") {
        try {
          req.body.financialProposal.manualBoqItems = JSON.parse(req.body.financialProposal.manualBoqItems);
        } catch (err) {
          errors.push({
            field: "financialProposal.manualBoqItems",
            value: req.body.financialProposal.manualBoqItems,
            error: "Invalid JSON format for manualBoqItems"
          });
        }
      }

      // Parse priceBreakdown
      if (req.body.financialProposal.priceBreakdown && typeof req.body.financialProposal.priceBreakdown === "string") {
        try {
          req.body.financialProposal.priceBreakdown = JSON.parse(req.body.financialProposal.priceBreakdown);
        } catch (err) {
          errors.push({
            field: "financialProposal.priceBreakdown",
            value: req.body.financialProposal.priceBreakdown,
            error: "Invalid JSON format for priceBreakdown"
          });
        }
      }

      // Parse financial proposal documents
      if (req.body.financialProposal.documents && typeof req.body.financialProposal.documents === "string") {
        try {
          req.body.financialProposal.documents = JSON.parse(req.body.financialProposal.documents);
        } catch (err) {
          errors.push({
            field: "financialProposal.documents",
            value: req.body.financialProposal.documents,
            error: "Invalid JSON format for financial proposal documents"
          });
        }
      }
    }

    // Parse otherDocuments for bid submission
    if (req.body.otherDocuments && typeof req.body.otherDocuments === "string") {
      try {
        req.body.otherDocuments = JSON.parse(req.body.otherDocuments);
      } catch (err) {
        errors.push({
          field: "otherDocuments",
          value: req.body.otherDocuments,
          error: "Invalid JSON format for otherDocuments"
        });
      }
    }

    // Parse address for bidder registration
    if (req.body.address && typeof req.body.address === "string") {
      try {
        req.body.address = JSON.parse(req.body.address);
      } catch (err) {
        errors.push({
          field: "address",
          value: req.body.address,
          error: "Invalid JSON format for address"
        });
      }
    }

    // Parse experience and qualifications for bidder registration
    if (req.body.experience && typeof req.body.experience === "string") {
      try {
        req.body.experience = JSON.parse(req.body.experience);
      } catch (err) {
        errors.push({
          field: "experience",
          value: req.body.experience,
          error: "Invalid JSON format for experience"
        });
      }
    }

    if (req.body.qualifications && typeof req.body.qualifications === "string") {
      try {
        req.body.qualifications = JSON.parse(req.body.qualifications);
      } catch (err) {
        errors.push({
          field: "qualifications",
          value: req.body.qualifications,
          error: "Invalid JSON format for qualifications"
        });
      }
    }

    // Parse profileDocuments for bidder registration
    if (req.body.profileDocuments && typeof req.body.profileDocuments === "string") {
      try {
        req.body.profileDocuments = JSON.parse(req.body.profileDocuments);
      } catch (err) {
        errors.push({
          field: "profileDocuments",
          value: req.body.profileDocuments,
          error: "Invalid JSON format for profileDocuments"
        });
      }
    }

    // Parse bidderId for bid submission (if sent as string)
    if (req.body.bidderId && typeof req.body.bidderId === "string") {
      // Validate it's a valid ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(req.body.bidderId)) {
        errors.push({
          field: "bidderId",
          value: req.body.bidderId,
          error: "Invalid ObjectId format for bidderId"
        });
      }
    }

    // REMOVED: Duplicate parsing for technicalProposal and financialProposal
    // The parsing is already handled above

    // Convert string numbers to actual numbers for specific fields
    const numericFields = [
      "estimatedBudget", 
      "totalBidPrice",
      "annualTurnover",
      "minimumExperience",
      "minimumTurnover"
    ];

    for (const field of numericFields) {
      if (req.body[field] && typeof req.body[field] === "string") {
        const parsed = parseFloat(req.body[field]);
        if (!isNaN(parsed)) {
          req.body[field] = parsed;
        }
      }
    }

    // Handle nested numeric fields in financialProposal.priceBreakdown
    if (req.body.financialProposal?.priceBreakdown) {
      const breakdownFields = ["materials", "labor", "equipment", "overheads", "profit"];
      for (const field of breakdownFields) {
        if (req.body.financialProposal.priceBreakdown[field] && typeof req.body.financialProposal.priceBreakdown[field] === "string") {
          const parsed = parseFloat(req.body.financialProposal.priceBreakdown[field]);
          if (!isNaN(parsed)) {
            req.body.financialProposal.priceBreakdown[field] = parsed;
          }
        }
      }
    }

    // Handle nested numeric fields in eligibilityCriteria
    if (req.body.eligibilityCriteria) {
      const criteriaFields = ["minimumExperience", "minimumTurnover"];
      for (const field of criteriaFields) {
        if (req.body.eligibilityCriteria[field] && typeof req.body.eligibilityCriteria[field] === "string") {
          const parsed = parseFloat(req.body.eligibilityCriteria[field]);
          if (!isNaN(parsed)) {
            req.body.eligibilityCriteria[field] = parsed;
          }
        }
      }
    }

    // Add debugging to see what's in the request body after parsing
    console.log("Parsed request body:", JSON.stringify({
      tenderId: req.body.tenderId,
      bidderId: req.body.bidderId,
      hasFinancialProposal: !!req.body.financialProposal,
      hasTechnicalProposal: !!req.body.technicalProposal
    }, null, 2));

    // If there are parsing errors, return them
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: "Error parsing request data",
        error: {
          type: "PARSING",
          details: errors
        }
      });
      return;
    }

    next();
  } catch (error) {
    logger.error("Unexpected parsing error in parseItemsMiddleware:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during data parsing",
      error: {
        type: "INTERNAL",
        details: process.env.NODE_ENV === "development" ? error : "Internal server error"
      }
    });
    return;
  }
}

export const parseCompanyData = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const errors: ParseError[] = [];
    const fieldsToParse = ["experience", "certifications"];

    for (const field of fieldsToParse) {
      if (req.body[field]) {
        try {
          if (typeof req.body[field] === "string") {
            req.body[field] = JSON.parse(req.body[field]);
          }
        } catch (e) {
          errors.push({
            field: field,
            value: req.body[field],
            error: `Invalid ${field} data format. Expected valid JSON.`,
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new AppError(
        "Error parsing request data",
        400,
        ErrorType.PARSING,
        errors
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Helper function to safely parse JSON if needed elsewhere
export const safeJsonParse = (value: string, fieldName: string): any => {
  try {
    return JSON.parse(value);
  } catch (error) {
    const e = error as Error;
    throw new AppError(
      `Invalid JSON format for ${fieldName}`,
      400,
      ErrorType.PARSING,
      { field: fieldName, value, error: e.message }
    );
  }
};