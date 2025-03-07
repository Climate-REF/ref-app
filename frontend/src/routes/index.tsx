import ExecutionInfo from "@/routes/executionInfo.tsx";
import Executions from "@/routes/executions";
import { Route, Routes } from "react-router";
import Dashboard from "./dashboard";
import AppLayout from "./layouts/AppLayout";

export const getRoutes = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/executions" element={<Executions />} />
        <Route path="/executions/:executionId" element={<ExecutionInfo />} />
      </Route>
    </Routes>
  );
};
