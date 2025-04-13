import ExecutionInfo from "@/routes/executionInfo.tsx";
import Executions from "@/routes/executions";
import Explorer from "@/routes/explorer.tsx";
import Metrics from "@/routes/metrics.tsx";
import { Route, Routes } from "react-router";
import Dashboard from "./dashboard";
import AppLayout from "./layouts/AppLayout";
import MetricInfo from "./metricInfo";

export const getRoutes = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route
          path="/metrics/:providerSlug/:metricSlug"
          element={<MetricInfo />}
        />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/executions" element={<Executions />} />
        <Route path="/executions/:groupId" element={<ExecutionInfo />} />
      </Route>
    </Routes>
  );
};
