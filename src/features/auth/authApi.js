import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL, API_IDS } from '../../constants/api';
import TokenService from '../../services/storage/tokenService';

// Helper function to add API ID to payload
const addApiId = (payload, apiId) => {
  return {
    ...payload,
    apiId
  };
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await TokenService.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    // Get OTP option details (API 1)
    getOtpOptionDetails: builder.mutation({
      query: (payload) => ({
        url: '/SUF00135/Mob/getOtpOptnChngDtl',
        method: 'POST',
        body: payload,
      }),
    }),
    
    // Get OTP log number (API 2)
    getOtpLogNumber: builder.mutation({
      query: (payload) => ({
        url: '/SUF00135/Mob/getOtpOptnChngLogNo',
        method: 'POST',
        body: addApiId(payload, API_IDS.GET_OTP_LOG_NUMBER),
      }),
    }),
    
    // Generate login OTP (API 3)
    generateLoginOtp: builder.mutation({
      query: (payload) => ({
        url: '/SUF00124/Mob/generateLoginOtp',
        method: 'POST',
        body: addApiId(payload, API_IDS.GENERATE_LOGIN_OTP),
      }),
    }),
    
    // Validate login OTP (API 4)
    validateLoginOtp: builder.mutation({
      query: (payload) => ({
        url: '/SUF00124/Mob/validateLoginOtp',
        method: 'POST',
        body: addApiId(payload, API_IDS.VALIDATE_LOGIN_OTP),
      }),
      transformResponse: (response) => {
        if (response.code === 0 && response.appMsgList.errorStatus === 0) {
          // Store token and user data
          const { token, ...userData } = response.content.mst;
          if (token) {
            TokenService.setTokens(token, token); // Using same token for refresh for now
            TokenService.setUserData(userData);
          }
        }
        return response;
      },
      invalidatesTags: ['User'],
    }),
    
    // Legacy login mutation (for backward compatibility)
    login: builder.mutation({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response) => {
        if (response.accessToken && response.refreshToken) {
          TokenService.setTokens(response.accessToken, response.refreshToken);
          TokenService.setUserData(response);
        }
        return response;
      },
      invalidatesTags: ['User'],
    }),
    
    getCurrentUser: builder.query({
      query: () => '/me',
      providesTags: ['User'],
    }),
    
    refreshToken: builder.mutation({
      query: (refreshData) => ({
        url: '/refresh',
        method: 'POST',
        body: refreshData,
      }),
    }),
  }),
});

export const {
  useGetOtpOptionDetailsMutation,
  useGetOtpLogNumberMutation,
  useGenerateLoginOtpMutation,
  useValidateLoginOtpMutation,
  useLoginMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useRefreshTokenMutation,
} = authApi;