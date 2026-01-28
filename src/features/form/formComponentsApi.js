import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../constants/api';

const test_token =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZW1vMX4yMDI2MDEyODAwMDAwMDAwMDAwMX5OIiwiaXNzIjoiU2ltYXBob3JlIiwiaWF0IjoxNzY5NTkwMDA4LCJleHAiOjE3Njk2MDgwMDh9.xw3PZU511xd_Lfny23nmY78R8w0aLlcxKfPGJayQblc';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: headers => {
    // const token = tokenService.getAccessToken();
    const token = test_token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

export const formComponentsApi = createApi({
  reducerPath: 'formComponentsApi',
  baseQuery,
  tagTypes: ['FormComponents'],
  endpoints: (builder) => ({
    getFormComponents: builder.mutation({
      query: (formData) => {
        console.log(
          '🔵 Form Components API Request - URL:',
          `${API_BASE_URL}/SUF00191/getAllFormComponents`
        );
        console.log('🔵 Form Components API Request - Payload:', formData);
        
        return {
          url: '/SUF00191/getAllFormComponents',
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: (response) => {
        console.log('🟢 Form Components API Response:', response);
        return response;
      },
      transformErrorResponse: (response) => {
        console.error('🔴 Form Components API Error:', response);
        return response;
      },
    }),
    submitFormData: builder.mutation({
      query: (formData) => ({
        url: '/SUF00191/submitFormData',
        method: 'POST',
        body: formData,
      }),
    }),
  }),
});

export const {
  useGetFormComponentsMutation,
  useSubmitFormDataMutation,
} = formComponentsApi;