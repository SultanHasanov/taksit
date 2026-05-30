import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { AuthProvider } from './context/AuthContext';
import { router } from './router/routes';
import { taksitTheme } from './theme/antdTheme';
import './theme/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider theme={taksitTheme} locale={ruRU}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConfigProvider>
  </StrictMode>
);
