import About from "@/routes/content/about.mdx";
import Dashboard from "@/routes/dashboard.tsx";
import ExecutionInfo from "@/routes/executionInfo.tsx";
import Executions from "@/routes/executions";
import Explorer from "@/routes/explorer.tsx";
import AppLayout from "@/routes/layouts/AppLayout.tsx";
import ContentLayout from "@/routes/layouts/ContentLayout.tsx";
import MetricInfo from "@/routes/metricInfo.tsx";
import Metrics from "@/routes/metrics.tsx";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: "explorer",
        Component: Explorer,
        // loader: explorerBreadcrumbsLoader,
      },
      {
        path: "metrics/:providerSlug/:metricSlug",
        Component: MetricInfo,
        // loader: metricInfoBreadcrumbsLoader,
      },
      {
        path: "metrics",
        Component: Metrics,
        // loader: metricsBreadcrumbsLoader,
      },
      {
        path: "executions",
        Component: Executions,
        // loader: executionsBreadcrumbsLoader,
      },
      {
        path: "executions/:groupId",
        Component: ExecutionInfo,
        // loader: executionInfoBreadcrumbsLoader,
      },
      {
        Component: ContentLayout,
        children: [
          {
            path: "content/about",
            Component: About,
            loader: () => ({
              breadcrumbs: [],
              title: "About",
            }),
          },
        ],
      },
    ],
  },
]);
