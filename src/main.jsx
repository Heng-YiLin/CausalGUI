import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ReactFlowProvider } from '@xyflow/react';
import { DnDProvider } from './components/DnDContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ReactFlowProvider>
      <DnDProvider>
        <App />
      </DnDProvider>
    </ReactFlowProvider>
  </React.StrictMode>
);
