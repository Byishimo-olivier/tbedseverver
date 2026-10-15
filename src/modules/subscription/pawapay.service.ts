import axios from "axios";
// import { v4 as uuidv4 } from "uuid";
import { logger } from "@/utils/logger";
import { AppError, ErrorType } from "@/utils/exceptions";

const BASE_URL = process.env.PAWAPAY_BASE_URL || "https://api.sandbox.pawapay.io";

/**
 * PawaPay Integration Service
 */
export class PawaPayService {
  private getHeaders() {
    const token = process.env.PAWAPAY_API_TOKEN;
    if (!token) {
      logger.error("PawaPay API token is missing in environment variables");
      throw new Error("PawaPay API token not configured");
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Step 5: Predict Provider
   * Validates the phone number and automatically detects the correct mobile money provider.
   */
  async predictProvider(phoneNumber: string): Promise<{ country: string; provider: string; phoneNumber: string }> {
    try {
      const response = await axios.post(
        `${BASE_URL}/v2/predict-provider`,
        { phoneNumber },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      logger.error("Error predicting PawaPay provider:", error.response?.data || error.message);
      throw new AppError("Failed to predict mobile money provider. Please check the phone number format.", 400, ErrorType.VALIDATION);
    }
  }

  /**
   * Step 6: Get Active Configurations
   * Retrieve active providers, limits, and supported currencies.
   */
  async getActiveConfig(country = "RWA") {
    try {
      const response = await axios.get(
        `${BASE_URL}/v2/active-conf?country=${country}&operationType=DEPOSIT`,
        { headers: this.getHeaders() }
      );
      return response.data; // List of enabled providers for the account
    } catch (error: any) {
      logger.error("Error fetching PawaPay active configuration:", error.response?.data || error.message);
      throw new AppError("Failed to fetch available payment providers.", 500, ErrorType.INTERNAL);
    }
  }

  /**
   * Step 4: Initiate Deposit
   * Starts a deposit from the customer's mobile money wallet via PawaPay.
   * NOTE: The depositId MUST be saved in the database before calling this method.
   */
  async initiateDeposit(params: {
    depositId: string;
    amount: number;
    currency: string;
    phoneNumber: string;
    provider: string;
  }) {
    try {
      const { depositId, amount, currency, phoneNumber, provider } = params;

      const response = await axios.post(
        `${BASE_URL}/v2/deposits`,
        {
          depositId,
          amount: String(amount),
          currency,
          payer: {
            type: "MMO",
            accountDetails: {
              phoneNumber,
              provider,
            },
          },
        },
        { headers: this.getHeaders() }
      );

      // Usually status: "ACCEPTED" or "REJECTED"
      return { depositId, ...response.data };
    } catch (error: any) {
      logger.error("Error initiating PawaPay deposit:", error.response?.data || error.message);
      
      const failureReason = JSON.stringify(error.response?.data || error.message);
      throw new AppError(`Payment initiation failed: ${failureReason}`, 400, ErrorType.VALIDATION);
    }
  }

 async createPaymentPage(params: {
  depositId: string;
  amount: number;
  currency: string;
  country: string;
  returnUrl: string;
  reason: string;
}) {
  try {
    const { depositId, amount, currency, country, returnUrl, reason } = params;

    // This matches the exact spec PawaPay gave you
    const body = {
      depositId,
      returnUrl,
      amountDetails: {
        amount: String(Math.round(amount)),
        currency: currency
      },
      country,
      reason
    };

    logger.info("Initiating PawaPay Hosted Page with amountDetails:", JSON.stringify(body));

    const response = await axios.post(
      `${BASE_URL}/v2/paymentpage`,
      body,
      { headers: this.getHeaders() }
    );

    return response.data;
  } catch (error: any) {
    const remoteError = error.response?.data;
    logger.error("PawaPay API Error:", JSON.stringify(remoteError || error.message));
    
    throw new AppError(
      `Failed to initialize payment page: ${JSON.stringify(remoteError || error.message)}`, 
      500, 
      ErrorType.INTERNAL
    );
  }
}

  /**
   * Check Deposit Status
   * Used for reconciliation.
   */
  async checkDepositStatus(depositId: string) {
    try {
      const response = await axios.get(
        `${BASE_URL}/v2/deposits/${depositId}`,
        { headers: this.getHeaders() }
      );
      return response.data; 
    } catch (error: any) {
      if (error.response?.status === 404) {
        // NOT_FOUND -> Payment doesn't exist on PawaPay
        return { status: "NOT_FOUND" };
      }
      logger.error(`Error checking deposit status for ${depositId}:`, error.response?.data || error.message);
      throw new AppError("Failed to check deposit status.", 500, ErrorType.INTERNAL);
    }
  }
}

export const pawapayService = new PawaPayService();
