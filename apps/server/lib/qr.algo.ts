import crypto from "crypto";

const SECRET = Bun.env.QR_SECRET!;

export function generateQRToken(sessionId: string) {
  const timeWindow = Math.floor(Date.now() / 15000); // 15 second window

  const data = sessionId + timeWindow;

  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("hex");

  return {
    qrString: `${sessionId}|${timeWindow}|${signature}`,
    timeWindow
  };
}

export function verifyQRToken(qrString: string) {
  const [sessionId, timeWindow, signature] = qrString.split("|");

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(sessionId + timeWindow)
    .digest("hex");

  if (expected !== signature) {
    return false;
  }

  const currentWindow = Math.floor(Date.now() / 15000);

  // allow only current window
  return currentWindow.toString() === timeWindow;
}