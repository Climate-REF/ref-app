import {Route, Routes} from "react-router";
import Dashboard from "./dashboard";
import AppLayout from "./layouts/AppLayout";


export const getRoutes = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/executions" element={<Dashboard />} />
        <Route path="/executions/:id" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}
