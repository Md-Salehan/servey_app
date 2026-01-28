export const API_BASE_URL = 'http://192.168.0.44/SuV4Sa';

export const API_ENDPOINTS = {
  // OTP Configuration APIs
  GET_OTP_OPTION_DETAILS: '/SUF00135/Mob/getOtpOptnChngDtl',
  GET_OTP_LOG_NUMBER: '/SUF00135/Mob/getOtpOptnChngLogNo',
  GENERATE_LOGIN_OTP: '/SUF00124/Mob/generateLoginOtp',
  VALIDATE_LOGIN_OTP: '/SUF00124/Mob/validateLoginOtp',
  
  // Legacy endpoints (keep for backward compatibility)
  LOGIN: '/login',
  REGISTER: '/register',
  ME: '/me',
  REFRESH: '/refresh',
  GENERATE_OTP: '/otp/generate',
  VALIDATE_OTP: '/otp/validate',
  RESEND_OTP: '/otp/resend',
};

export const API_TIMEOUT = 10000;

// OTP Type Codes
export const OTP_TYPE_CODES = {
  LOGIN: "T0008",
  REGISTRATION: '2',
  FORGOT_PASSWORD: '3'
};

// API IDs from documentation
export const API_IDS = {
  GET_OTP_OPTION_DETAILS: 'SUA00514',
  GET_OTP_LOG_NUMBER: 'SUA00515',
  GENERATE_LOGIN_OTP: 'SUA00455',
  VALIDATE_LOGIN_OTP: 'SUA00467'
};