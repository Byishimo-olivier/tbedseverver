import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY;

const createApiUserAndKey = async () => {
  if (!SUBSCRIPTION_KEY) {
    console.error('Error: MOMO_SUBSCRIPTION_KEY is missing in .env file');
    process.exit(1);
  }

  const userId = uuidv4();
  const baseUrl = 'https://sandbox.momodeveloper.mtn.com/v1_0';

  try {
    // Step 1: Create API User
    console.log('Creating API User...');
    await axios.post(
      `${baseUrl}/apiuser`,
      { providerCallbackHost: 'infrasoko.com' },
      {
        headers: {
          'X-Reference-Id': userId,
          'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`API User created: ${userId}`);

    // Step 2: Generate API Key
    console.log('Generating API Key...');
    const { data } = await axios.post(
      `${baseUrl}/apiuser/${userId}/apikey`,
      {},
      {
        headers: {
          'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        },
      }
    );

    console.log('\n=== SUCCESS! Copy these to your .env file ===');
    console.log(`MOMO_API_USER=${userId}`);
    console.log(`MOMO_API_KEY=${data.apiKey}`);
    console.log('=============================================');
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
};

createApiUserAndKey();