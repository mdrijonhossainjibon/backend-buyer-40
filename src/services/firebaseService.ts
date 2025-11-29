import admin  from   'firebase-admin'
import  path  from 'path'

class FirebaseService {
  private static instance: FirebaseService;
  private initialized: boolean = false;

  private constructor() {
    this.initializeFirebase();
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  private initializeFirebase(): void {
    try {
      if (!this.initialized) {
        const serviceAccount = require(path.join(
          __dirname,
          '../config/pushnotificationtester-e0412-firebase-adminsdk-fbsvc-7fb9566b5b.json'
        ));

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: "https://fa-admin-panel-b9b48-default-rtdb.firebaseio.com"
        });

        this.initialized = true;
        console.log('✅ Firebase Admin initialized successfully');
      }
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      throw error;
    }
  }

  /**
   * Send a notification to a single device
   */
  async sendToDevice(token: string, title: string, body: string, data?: any): Promise<string> {
    try {
      const message: any = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Message sent successfully:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple devices
   */
  async sendToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: any
  ): Promise<any> {
    try {
      const message: any = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ ${response.successCount} messages sent successfully`);
      if (response.failureCount > 0) {
        console.log(`❌ ${response.failureCount} messages failed`);
      }
      return response;
    } catch (error: any) {
      console.error('❌ Error sending multicast message:', error);
      throw error;
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(topic: string, title: string, body: string, data?: any): Promise<string> {
    try {
      const message: any = {
        topic,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      
      console.log('✅ Message sent to topic successfully:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Error sending message to topic:', error);
      throw error;
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<any> {
    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      console.log(`✅ Successfully subscribed to topic ${topic}:`, response.successCount);
      return response;
    } catch (error: any) {
      console.error('❌ Error subscribing to topic:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<any> {
    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      
      console.log(`✅ Successfully unsubscribed from topic ${topic}:`, response.successCount);
      return response;
    } catch (error: any) {
      console.error('❌ Error unsubscribing from topic:', error);
      throw error;
    }
  }
}

export default FirebaseService.getInstance();
