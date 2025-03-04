import {getRoutes} from "@/routes";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { BrowserRouter } from "react-router";
import {client} from "@/client/client.gen"

client.setConfig({baseUrl: import.meta.env.VITE_BASE_URL})

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {getRoutes()}
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
