import "./lib/storage-shim.js";
import React from "react";
import { createRoot } from "react-dom/client";
import ShellApp from "./ShellApp.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(<ShellApp />);
