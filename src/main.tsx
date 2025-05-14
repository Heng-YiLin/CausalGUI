import React from "react";
import ReactDOM from "react-dom/client";
import Header from "./components/Header";
import { BrowserRouter } from "react-router";

import App from "./App";
import "antd/dist/reset.css";

import "./index.css";
import { ReactFlowProvider } from "@xyflow/react";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ReactFlowProvider>
        <Header />
        <App />
      </ReactFlowProvider>
    </BrowserRouter>
  </React.StrictMode>
);
