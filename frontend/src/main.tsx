import {getRoutes} from "@/routes";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { BrowserRouter } from "react-router";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {getRoutes()}
    </BrowserRouter>
  </StrictMode>,
)
