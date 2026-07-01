import "./lib/storage-shim.js";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "@game";
import "./index.css";

createRoot(document.getElementById("root")).render(<App />);
