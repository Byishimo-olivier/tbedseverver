import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const verifyApiUser = async () => {
  const SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY;
  const API_USER = process.env.MOMO_API_USER;

  if (!SUBSCRIPTION_KEY || !API_USER) {
    console.error('Missing MOMO_SUBSCRIPTION_KEY or MOMO_API_USER in .env');
    process.exit(1);
  }

  console.log('Verifying API User...');
  console.log(`Subscription Key: ${SUBSCRIPTION_KEY.substring(0, 8)}...`);
  console.log(`API User: ${API_USER}`);

  try {
    const response = await axios.get(
      `https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/${API_USER}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        },
      }
    );

    console.log('\n✅ API User is VALID');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('\n❌ API User verification FAILED');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n⚠️  The API User does not exist or was created with a different subscription key.');
      console.log('   Please run: npm run setup:momo');
    }
  }
};

verifyApiUser();