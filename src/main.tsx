import React from 'react';
import ReactDOM from 'react-dom/client';
import Header from './components/Header';

import App from './App';

import './index.css';
import { ReactFlowProvider } from '@xyflow/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReactFlowProvider>
      <Header/>
      <App />
    </ReactFlowProvider>
  </React.StrictMode>
);
