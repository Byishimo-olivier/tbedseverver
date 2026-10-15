import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const testMoMoPayment = async () => {
  const MOMO_HOST = 'https://sandbox.momodeveloper.mtn.com';
  const SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY;
  const API_USER = process.env.MOMO_API_USER;
  const API_KEY = process.env.MOMO_API_KEY;

  console.log('=== MoMo Payment Test ===\n');
  console.log('Subscription Key:', SUBSCRIPTION_KEY?.substring(0, 8) + '...');
  console.log('API User:', API_USER);
  console.log('API Key:', API_KEY?.substring(0, 8) + '...');

  if (!SUBSCRIPTION_KEY || !API_USER || !API_KEY) {
    console.error('\n❌ Missing credentials in .env file');
    process.exit(1);
  }

  try {
    // Step 1: Get Token
    console.log('\n1. Getting access token...');
    const basicAuth = Buffer.from(`${API_USER}:${API_KEY}`).toString('base64');
    
    const tokenResponse = await axios.post(
      `${MOMO_HOST}/collection/token/`,
      {},
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        },
      }
    );
    
    const token = tokenResponse.data.access_token;
    console.log('✅ Token obtained successfully');

    // Step 2: Make Payment Request
    console.log('\n2. Initiating payment request...');
    const referenceId = uuidv4();
    
    const paymentResponse = await axios.post(
      `${MOMO_HOST}/collection/v1_0/requesttopay`,
      {
        amount: '100',
        currency: 'EUR',
        externalId: 'test-' + Date.now(),
        payer: {
          partyIdType: 'MSISDN',
          partyId: '250788123456', // Test number for success
        },
        payerMessage: 'Test payment',
        payeeNote: 'Test',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Payment Response Status:', paymentResponse.status);
    console.log('Payment Response Data:', paymentResponse.data);

    if (paymentResponse.status === 202) {
      console.log('✅ Payment request accepted!');
      console.log('Reference ID:', referenceId);

      // Step 3: Check Status
      console.log('\n3. Checking payment status...');
      
      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(
        `${MOMO_HOST}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
          },
        }
      );

      console.log('✅ Payment Status:', statusResponse.data.status);
      console.log('Full Response:', JSON.stringify(statusResponse.data, null, 2));
    } else {
      console.log('❌ Unexpected response:', paymentResponse.data);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.data?.includes?.('Request Rejected')) {
      console.log('\n⚠️  Your request was rejected by MoMo WAF.');
      console.log('   This usually means:');
      console.log('   1. API User was created with different subscription key');
      console.log('   2. Subscription key is from wrong product (not Collection)');
      console.log('\n   Solution: Go to momodeveloper.mtn.com, get your Collection');
      console.log('   Primary Key, update .env, and run: npm run setup:momo');
    }
  }
};

testMoMoPayment();