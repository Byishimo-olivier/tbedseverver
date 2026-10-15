import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ErrorType } from '@/utils/exceptions';
import { logger } from '@/utils/logger';

const MOMO_HOST = process.env.MOMO_HOST || 'https://sandbox.momodeveloper.mtn.com';
const COLLECTION_PRIMARY_KEY = process.env.MOMO_SUBSCRIPTION_KEY;
const API_USER = process.env.MOMO_API_USER;
const API_KEY = process.env.MOMO_API_KEY;
const TARGET_ENVIRONMENT = process.env.MOMO_ENVIRONMENT || 'sandbox';
const CURRENCY = process.env.MOMO_CURRENCY || 'EUR';

export enum MoMoPaymentStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
}

export interface MoMoPaymentResult {
  referenceId: string;
  status: MoMoPaymentStatus;
  amount?: string;
  currency?: string;
  financialTransactionId?: string;
  reason?: string;
}

export interface PreApprovalResult {
  referenceId: string;
  status: string;
  preApprovalId?: string;
}

class MoMoService {
  constructor() {
    // Log config on startup for debugging
    logger.info('MoMo Service Config:', {
      host: MOMO_HOST,
      environment: TARGET_ENVIRONMENT,
      currency: CURRENCY,
      hasSubscriptionKey: !!COLLECTION_PRIMARY_KEY,
      subscriptionKeyPrefix: COLLECTION_PRIMARY_KEY?.substring(0, 8) + '...',
      hasApiUser: !!API_USER,
      apiUserPrefix: API_USER?.substring(0, 8) + '...',
      hasApiKey: !!API_KEY,
    });
  }

  private getBasicAuthToken(): string {
    if (!API_USER || !API_KEY) {
      throw new AppError(
        'MoMo API credentials not configured',
        500,
        ErrorType.INTERNAL
      );
    }
    return Buffer.from(`${API_USER}:${API_KEY}`).toString('base64');
  }

  private validateConfig(): void {
    if (!COLLECTION_PRIMARY_KEY) {
      throw new AppError(
        'MoMo subscription key not configured',
        500,
        ErrorType.INTERNAL
      );
    }
    if (!API_USER || !API_KEY) {
      throw new AppError(
        'MoMo API credentials not configured',
        500,
        ErrorType.INTERNAL
      );
    }
  }

  async getToken(): Promise<string> {
    this.validateConfig();
    
    const url = `${MOMO_HOST}/collection/token/`;
    const config = {
      headers: {
        Authorization: `Basic ${this.getBasicAuthToken()}`,
        'Ocp-Apim-Subscription-Key': COLLECTION_PRIMARY_KEY,
      },
    };

    try {
      logger.info('Requesting MoMo token...');
      const response = await axios.post(url, {}, config);
      logger.info('MoMo token obtained successfully');
      return response.data.access_token;
    } catch (error: any) {
      logger.error('Failed to get MoMo token:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new AppError(
        'Failed to authenticate with MoMo API',
        500,
        ErrorType.INTERNAL
      );
    }
  }

  async requestToPay(
    amount: string,
    phoneNumber: string,
    externalId?: string,
    payerMessage?: string,
    payeeNote?: string
  ): Promise<string> {
    const token = await this.getToken();
    const referenceId = uuidv4();
    const url = `${MOMO_HOST}/collection/v1_0/requesttopay`;

    // Don't format the phone number for sandbox test numbers
    const formattedPhone = phoneNumber.startsWith('467') 
      ? phoneNumber 
      : this.formatPhoneNumber(phoneNumber);

    
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9\s\-_]/g, '');

    const body = {
      amount: amount.toString(),
      currency: CURRENCY,
      externalId: externalId || referenceId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: formattedPhone,
      },
      payerMessage: sanitize(payerMessage || 'Subscription payment'),
      payeeNote: sanitize(payeeNote || 'Thank you for your subscription'),
    };

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': TARGET_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': COLLECTION_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
    };

    logger.info('MoMo requestToPay - Request Details:', {
      url,
      referenceId,
      body,
      headers: {
        'X-Reference-Id': referenceId,
        'X-Target-Environment': TARGET_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': COLLECTION_PRIMARY_KEY?.substring(0, 8) + '...',
      },
    });

    try {
      const response = await axios.post(url, body, config);
      
      logger.info('MoMo requestToPay - Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      });

      // MoMo returns 202 Accepted for successful request
      if (response.status === 202) {
        logger.info(`MoMo payment request accepted: ${referenceId}`);
        return referenceId;
      } else {
        logger.warn(`MoMo unexpected status: ${response.status}`);
        return referenceId;
      }
    } catch (error: any) {
      logger.error('MoMo payment request failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message,
      });
      throw new AppError(
        error.response?.data?.message || 'Payment request failed',
        400,
        ErrorType.VALIDATION
      );
    }
  }

  async getPaymentStatus(referenceId: string): Promise<MoMoPaymentResult> {
    const token = await this.getToken();
    const url = `${MOMO_HOST}/collection/v1_0/requesttopay/${referenceId}`;

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': TARGET_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': COLLECTION_PRIMARY_KEY,
      },
    };

    logger.info('Checking MoMo payment status:', { referenceId, url });

    try {
      const response = await axios.get(url, config);
      const data = response.data;

      logger.info('MoMo payment status response:', {
        referenceId,
        status: data.status,
        data,
      });

      let status: MoMoPaymentStatus;
      switch (data.status) {
        case 'SUCCESSFUL':
          status = MoMoPaymentStatus.SUCCESSFUL;
          break;
        case 'FAILED':
          status = MoMoPaymentStatus.FAILED;
          break;
        default:
          status = MoMoPaymentStatus.PENDING;
      }

      return {
        referenceId,
        status,
        amount: data.amount,
        currency: data.currency,
        financialTransactionId: data.financialTransactionId,
        reason: data.reason,
      };
    } catch (error: any) {
      logger.error('Failed to get payment status:', {
        referenceId,
        status: error.response?.status,
        data: error.response?.data,
      });
      
      if (error.response?.status === 404) {
        throw new AppError(
          `Payment ${referenceId} not found on MoMo`,
          404,
          ErrorType.NOT_FOUND
        );
      }
      
      throw new AppError(
        'Failed to check payment status',
        500,
        ErrorType.INTERNAL
      );
    }
  }

  async requestPreApproval(
    phoneNumber: string,
    validityTimeSeconds: number = 3600
  ): Promise<string> {
    const token = await this.getToken();
    const referenceId = uuidv4();
    const url = `${MOMO_HOST}/collection/v1_0/preapproval`;

    const body = {
      payer: {
        partyIdType: 'MSISDN',
        partyId: this.formatPhoneNumber(phoneNumber),
      },
      payerCurrency: CURRENCY,
      payerMessage: 'Please approve auto-debits for subscription',
      validityTime: validityTimeSeconds,
    };

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': TARGET_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': COLLECTION_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
    };

    try {
      await axios.post(url, body, config);
      logger.info(`MoMo pre-approval request initiated: ${referenceId}`);
      return referenceId;
    } catch (error: any) {
      logger.error('MoMo pre-approval request failed:', error.response?.data || error.message);
      throw new AppError(
        error.response?.data?.message || 'Pre-approval request failed',
        400,
        ErrorType.VALIDATION
      );
    }
  }

  async getPreApprovalStatus(referenceId: string): Promise<PreApprovalResult> {
    const token = await this.getToken();
    const url = `${MOMO_HOST}/collection/v1_0/preapproval/${referenceId}`;

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': TARGET_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': COLLECTION_PRIMARY_KEY,
      },
    };

    try {
      const response = await axios.get(url, config);
      return {
        referenceId,
        status: response.data.status,
        preApprovalId: response.data.preApprovalId,
      };
    } catch (error: any) {
      logger.error('Failed to get pre-approval status:', error.response?.data || error.message);
      throw new AppError(
        'Failed to check pre-approval status',
        500,
        ErrorType.INTERNAL
      );
    }
  }

  async createSubscriptionPayment(
    amount: string,
    phoneNumber: string,
    subscriptionId: string,
    planName: string
  ): Promise<string> {
    return this.requestToPay(
      amount,
      phoneNumber,
      subscriptionId,
      `Payment for ${planName} subscription`,
      'Infrasoko Subscription'
    );
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle various formats and ensure proper MSISDN format
    // For Rwanda: 250XXXXXXXXX
    if (cleaned.startsWith('0')) {
      cleaned = '250' + cleaned.substring(1);
    } else if (!cleaned.startsWith('250') && cleaned.length === 9) {
      cleaned = '250' + cleaned;
    }
    
    return cleaned;
  }
}

export const momoService = new MoMoService();