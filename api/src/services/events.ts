import { db } from '../db';
import { userEvents } from '../db/schema';
import jwt from 'jsonwebtoken';
import { UAParser } from 'ua-parser-js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const eventsService = {
  async trackEvent(data: {
    eventName: string;
    extraData?: string;
    url?: string;
    ip: string;
    userAgent?: string;
    authHeader?: string;
  }) {
    const { eventName, extraData, url, ip, userAgent, authHeader } = data;

    // Try to get user ID from token if present
    let userId: string | null = null;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        if (token) {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.id;
        }
      } catch (e) {
        // Ignore token errors, treat as anonymous
      }
    }

    // Parse User Agent
    let browserStr = 'unknown:unknown';
    let osStr = 'unknown:unknown';
    let deviceStr = 'unknown:unknown';

    if (userAgent) {
      try {
        const parser = new UAParser(userAgent);
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();

        browserStr = `${browser.name || 'unknown'}:${browser.version || 'unknown'}`;
        osStr = `${os.name || 'unknown'}:${os.version || 'unknown'}`;
        deviceStr = `${device.vendor || 'unknown'}:${device.model || 'unknown'}`;
      } catch (e) {
        // Keep defaults on error
      }
    }

    await db.insert(userEvents).values({
      eventName,
      userId,
      extraData,
      url,
      ip,
      userAgent,
      browser: browserStr,
      os: osStr,
      device: deviceStr
    });

    return { success: true };
  }
};
