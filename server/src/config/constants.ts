import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'vyntra_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
  QUOTA_TIMEZONE: process.env.QUOTA_TIMEZONE || 'Asia/Kolkata',
  RESERVATION_TIMEOUT_MINUTES: 15,
};

export const DEFAULT_PLANS = [
  {
    name: 'FREE',
    displayName: 'Free Starter',
    price: 0,
    billingInterval: 'DAILY',
    downloadLimit: 1, // 1 successful download per day
    quotaPeriod: 'DAILY',
    deviceLimit: 1,
    badgeColor: '#9CA3AF',
    features: JSON.stringify([
      '1 Video Download per day',
      'Standard 720p & 1080p Streaming',
      'Full Community Access & Comments',
      'Multilingual Comment Translations',
      '1 Registered Device'
    ]),
  },
  {
    name: 'BRONZE',
    displayName: 'Bronze Creator',
    price: 199,
    billingInterval: 'MONTHLY',
    downloadLimit: 10, // 10 downloads per day
    quotaPeriod: 'DAILY',
    deviceLimit: 2,
    badgeColor: '#CD7F32',
    features: JSON.stringify([
      '10 Video Downloads per day',
      'Full HD 1080p Downloads & Streaming',
      'Priority Fast-Track Download Speeds',
      'Follow Unlimited Creators',
      '2 Registered Devices',
      'Ad-free Playback Experience'
    ]),
  },
  {
    name: 'SILVER',
    displayName: 'Silver Pro',
    price: 499,
    billingInterval: 'MONTHLY',
    downloadLimit: 25, // 25 downloads per day
    quotaPeriod: 'DAILY',
    deviceLimit: 4,
    badgeColor: '#94A3B8',
    features: JSON.stringify([
      '25 Video Downloads per day',
      'Ultra HD 4K Support',
      'High-Speed CDN Delivery',
      'Early Access to Exclusive Content',
      '4 Registered Devices',
      'Creator Direct Interaction Perks'
    ]),
  },
  {
    name: 'GOLD',
    displayName: 'Gold VIP',
    price: 999,
    billingInterval: 'MONTHLY',
    downloadLimit: 100, // 100 downloads per day
    quotaPeriod: 'DAILY',
    deviceLimit: 10,
    badgeColor: '#F59E0B',
    features: JSON.stringify([
      '100 Video Downloads per day',
      'Maximum Bitrate & Master Audio Quality',
      'Unrestricted Instant Batch Transfers',
      'VIP Creator Community Badge',
      'Up to 10 Registered Devices',
      'Dedicated Priority Support'
    ]),
  },
];
