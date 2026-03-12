import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

/**
 * Utility to send push notifications securely via Expo SDK.
 * @param tokens Array of Expo Push Tokens to notify. Invalid ones will be skipped automatically.
 * @param title The title of the notification
 * @param body The body string of the notification
 * @param data Optional supplementary JSON data to include in the push payload
 */
export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  // Filter out invalid Expo push tokens
  const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));
  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = [];

  for (const pushToken of validTokens) {
    messages.push({
      to: pushToken,
      sound: "default",
      title,
      body,
      data: data || {},
    });
  }

  // The Expo push notification service accepts batches of notifications so
  // that you don't need to send 1000 requests to send 1000 notifications. We
  // recommend you batch your notifications to reduce the number of requests
  // and to compress them (notifications with similar content will get compressed).
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  // Send the chunks to the Expo push notification service. There are
  // different strategies you could use. A simple one is to send one chunk at a
  // time, which nicely spreads the load out over time:
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log("Sent notification chunk", ticketChunk);
      tickets.push(...ticketChunk);
      // NOTE: If a ticket contains an error code in ticket.details.error, you
      // must handle it appropriately. The error codes are listed in the Expo
      // documentation:
      // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
    } catch (error) {
      console.error("Error sending push notification chunk", error);
    }
  }

  // Note: we can optionally retrieve receipts later to check if Apple/Google successfully delivered them,
  // but for standard feedback we'll just log any immediate dispatch errors above.
}
