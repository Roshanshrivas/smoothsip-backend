// server/service/pushService.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import logger from '../utils/logger.js';

let app = null;

const initializeFirebase = () => {
  if (!app) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      if (!serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Service account is missing private_key or client_email');
      }
      
      app = initializeApp({
        credential: cert(serviceAccount),
      });
   
      logger.info('🔥 Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization error:', error.message);
      logger.error('Firebase initialization error:', error.message);
      throw new Error(`Failed to initialize Firebase: ${error.message}`);
    }
  }
};

export const sendPushNotification = async ({ tokens, title, body, data = {} }) => {
  if (!tokens || tokens.length === 0) {
    logger.warn('Push send skipped: No tokens');
    return { success: false, error: 'No tokens', successes: 0, failures: 0, failureReasons: [] };
  }

  try {
    initializeFirebase();

    const messaging = getMessaging(app);
    const message = {
      notification: { title, body },
      data,
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    const successes = response.responses.filter(r => r.success).length;
    const failures = response.responses.length - successes;

    // ✅ Collect detailed failure reasons
    const failureReasons = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorMsg = resp.error?.message || 'Unknown error';
        console.error(`❌ Push failed for token ${idx}:`, errorMsg);
        failureReasons.push({ tokenIndex: idx, error: errorMsg });
      }
    });

    logger.info(`✅ Push sent: ${successes} successes, ${failures} failures`);
    return { 
      success: true, 
      successes, 
      failures, 
      failureReasons 
    };
  } catch (error) {
    console.error('❌ Push send error:', error.message);
    logger.error('Push send error:', error.message);
    return { 
      success: false, 
      error: error.message, 
      successes: 0, 
      failures: tokens.length,
      failureReasons: [{ error: error.message }]
    };
  }
};