import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ProvedorDoVoxix } from "./estado";
import "./index.css";
import { iniciarVisual } from "./personalizar";

iniciarVisual();

createRoot(document.getElementById("raiz")!).render(<StrictMode><ProvedorDoVoxix><App /></ProvedorDoVoxix></StrictMode>);
