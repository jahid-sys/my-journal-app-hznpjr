
import Constants from 'expo-constants';

// Read backend URL from app.json configuration
export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || '';

// Log the backend URL for debugging
console.log('🔗 Backend URL configured:', BACKEND_URL);

// Helper function for API calls with proper error handling
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;
  console.log(`📡 API Call: ${options?.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ API Success:`, data);
    return data;
  } catch (error) {
    console.error(`❌ API Call failed:`, error);
    throw error;
  }
}
