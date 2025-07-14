 import axios from 'axios';

 const axiosServices = axios.create();
 
 // interceptor for http
 axiosServices.interceptors.response.use(
     (response) => response,
     (error) => {
         console.error('API Error:', error);
         
         // Handle different error scenarios
         if (error.response) {
             // Server responded with error status
             const errorMessage = error.response.data?.error || error.response.data?.message || `Server Error: ${error.response.status}`;
             return Promise.reject(new Error(errorMessage));
         } else if (error.request) {
             // Request was made but no response received
             return Promise.reject(new Error('No response from server. Please check your connection.'));
         } else {
             // Something else happened
             return Promise.reject(new Error(error.message || 'An unexpected error occurred'));
         }
     }
 );
 
 export default axiosServices;
 