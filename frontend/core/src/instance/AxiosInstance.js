import axios from 'axios';

console.log(process.env.REACT_APP_API_URL)

const axiosInstance = axios.create({baseURL: `${process.env.REACT_APP_API_URL}`,
  withCredentials: true, 
});

axiosInstance.interceptors.request.use(
  (config) => {
      if (!config.headers['Content-Type']) 
          config.headers['Content-Type'] = 'application/json';
      return config;
  },
  (error) => {
    Promise.reject(error)
  }
);

export default axiosInstance;
