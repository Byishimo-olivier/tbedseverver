import axios from "axios";
import { logger } from "@/utils/logger";
import { AppError, ErrorType } from "@/utils/exceptions";

// Pesapal API endpoints
const PESAPAL_BASE_URL = process.env.PESAPAL_BASE_URL || "https://pay.pesapal.com/v3";
const PESAPAL_OAUTH_URL = process.env.PESAPAL_OAUTH_URL || "https://pay.pesapal.com/v3/api/Auth/RequestToken";
const PESAPAL_IPN_URL = process.env.PESAPAL_IPN_URL || "https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN";

// Rwanda specific
const DEFAULT_COUNTRY = "RW";
const DEFAULT_CURRENCY = "RWF";

interface PesapalToken {
  token: string;
  expiry: Date;
}

// Removed unused PesapalIPN interface

/**
 * Pesapal Integration Service for Rwanda
 */
export class PesapalService {
  private accessToken: PesapalToken | null = null;
  private registeredIpnId: string | null = null;

  private getConsumerKey(): string {
    const key = process.env.PESAPAL_CONSUMER_KEY;
    if (!key) {
      throw new Error("Pesapal consumer key not configured");
    }
    return key;
  }

  private getConsumerSecret(): string {
    const secret = process.env.PESAPAL_CONSUMER_SECRET;
    if (!secret) {
      throw new Error("Pesapal consumer secret not configured");
    }
    return secret;
  }

  /**
   * Get OAuth 2.0 token from Pesapal
   */
  private async getAccessToken(): Promise<string> {
    // Check if token is still valid (with 5 min buffer)
    if (this.accessToken && this.accessToken.expiry > new Date()) {
      return this.accessToken.token;
    }

    try {
      const response = await axios.post(
        PESAPAL_OAUTH_URL,
        {
          consumer_key: this.getConsumerKey(),
          consumer_secret: this.getConsumerSecret(),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const { token, expiry_date } = response.data;
      
      this.accessToken = {
        token,
        expiry: new Date(expiry_date),
      };

      logger.info("Pesapal access token obtained successfully");
      return token;
    } catch (error: any) {
      logger.error("Error obtaining Pesapal token:", error.response?.data || error.message);
      throw new AppError("Failed to authenticate with payment provider", 500, ErrorType.INTERNAL);
    }
  }

  /**
   * Register IPN (Instant Payment Notification) URL for callbacks
   */
  async registerIpnUrl(): Promise<string> {
  if (this.registeredIpnId) {
    return this.registeredIpnId;
  }

  try {
    const token = await this.getAccessToken();
    const callbackUrl = `${process.env.API_BASE_URL}/api/v1/subscriptions/callbacks/pesapal`;

    const response = await axios.post(
      PESAPAL_IPN_URL,
      {
        url: callbackUrl,
        ipn_notification_type: "POST",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const ipnId = response.data.ipn_id;
    this.registeredIpnId = ipnId;
    logger.info(`Pesapal IPN registered: ${ipnId}`);
    return ipnId; // ipnId is guaranteed to be a string
  } catch (error: any) {
    logger.error("Error registering Pesapal IPN:", error.response?.data || error.message);
    throw new AppError("Failed to register payment callback", 500, ErrorType.INTERNAL);
  }
}

  /**
   * Submit order to Pesapal for payment
   */
  async submitOrder(params: {
    orderTrackingId: string;
    amount: number;
    currency: string;
    description: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    returnUrl: string;
    cancelUrl?: string;
    /** Customer account number — enables recurring payment option on Pesapal iframe */
    accountNumber?: string;
    /** Pre-fill subscription details (user won't edit on the iframe) */
    subscriptionDetails?: {
      startDate: string;  // dd-MM-yyyy
      endDate: string;    // dd-MM-yyyy
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    };
  }) {
    try {
      const token = await this.getAccessToken();
      const ipnId = await this.registerIpnUrl();

      const orderData: Record<string, any> = {
        id: params.orderTrackingId,
        currency: params.currency || DEFAULT_CURRENCY,
        amount: params.amount,
        description: params.description,
        callback_url: params.returnUrl,
        cancellation_url: params.cancelUrl || params.returnUrl,
        notification_id: ipnId,
        billing_address: {
          email_address: params.email || "",
          phone_number: params.phoneNumber || "",
          country_code: DEFAULT_COUNTRY,
          first_name: params.firstName || "",
          last_name: params.lastName || "",
        },
      };

      // Enable recurring / subscription payment option on Pesapal iframe
      if (params.accountNumber) {
        orderData.account_number = params.accountNumber;
      }
      if (params.subscriptionDetails) {
        orderData.subscription_details = {
          start_date: params.subscriptionDetails.startDate,
          end_date: params.subscriptionDetails.endDate,
          frequency: params.subscriptionDetails.frequency,
        };
      }

      const response = await axios.post(
        `${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      logger.info(`Pesapal order submitted: ${params.orderTrackingId}`);
      
      return {
        orderTrackingId: params.orderTrackingId,
        redirectUrl: response.data.redirect_url,
        pesapalMerchantReference: response.data.merchant_reference,
        pesapalTrackingId: response.data.order_tracking_id,
      };
    } catch (error: any) {
      logger.error("Error submitting order to Pesapal:", error.response?.data || error.message);
      throw new AppError(
        `Failed to initiate payment: ${error.response?.data?.error?.message || error.message}`,
        400,
        ErrorType.VALIDATION
      );
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(orderTrackingId: string) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          params: {
            orderTrackingId,
          },
        }
      );

      const data = response.data;
      
      // Map Pesapal status to our internal status
      let mappedStatus: "COMPLETED" | "FAILED" | "PENDING" = "PENDING";
      
      switch (data.status_code) {
        case 1: // COMPLETED
        case 2: // COMPLETED with warning
          mappedStatus = "COMPLETED";
          break;
        case 3: // FAILED
        case 4: // REVERSED
        case 5: // INVALID
          mappedStatus = "FAILED";
          break;
        default:
          mappedStatus = "PENDING";
      }

      return {
        orderTrackingId: data.order_tracking_id,
        merchantReference: data.merchant_reference,
        status: mappedStatus,
        statusCode: data.status_code,
        statusMessage: data.payment_status_description || "Unknown status",
        paymentMethod: data.payment_method,
        amount: data.amount,
        currency: data.currency,
        paymentDate: data.created_date,
        paymentAccount: data.payment_account,
        confirmationCode: data.confirmation_code,
        /** Recurring subscription info — present when the IPN is a recurring payment */
        subscriptionTransactionInfo: data.subscription_transaction_info || undefined,
      };
    } catch (error: any) {
      logger.error(`Error checking transaction status for ${orderTrackingId}:`, error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        return { status: "NOT_FOUND", orderTrackingId };
      }
      
      throw new AppError("Failed to check payment status", 500, ErrorType.INTERNAL);
    }
  }

  /**
   * Verify payment confirmation (for webhook/callback)
   */
  async verifyPayment(merchantReference: string) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          params: {
            merchantReference,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error(`Error verifying payment for ${merchantReference}:`, error.response?.data || error.message);
      throw new AppError("Failed to verify payment", 500, ErrorType.INTERNAL);
    }
  }

  /**
   * Get available payment methods for Rwanda
   */
  async getPaymentMethods() {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${PESAPAL_BASE_URL}/api/Checkout/Billing/GetPaymentMethods`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          params: {
            currency: DEFAULT_CURRENCY,
            country: DEFAULT_COUNTRY,
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      logger.error("Error fetching Pesapal payment methods:", error.response?.data || error.message);
      // Don't throw, just return empty array as this is not critical
      return { payment_methods: [] };
    }
  }
}

export const pesapalService = new PesapalService();