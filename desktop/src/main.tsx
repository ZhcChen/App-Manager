import React from "react";
import ReactDOM from "react-dom/client";
import "@app-manager/brand/styles/fonts.css";
import "@app-manager/brand/styles/tokens.css";
import "./styles/base.css";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
