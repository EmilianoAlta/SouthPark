import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../workspace-app.jsx";
import PresentacionDemo from "./components/PresentacionDemo.jsx";

const isPresentation = new URLSearchParams(window.location.search).has("presentacion");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isPresentation ? <PresentacionDemo /> : <App />}
  </StrictMode>
);
