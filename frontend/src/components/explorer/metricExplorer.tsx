"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { BarChart, LineChart, PieChart, Table } from "lucide-react";
import { useState } from "react";

// Mock data for metrics
const mockMetrics = [
  {
    id: "metric-001",
    name: "Surface Temperature Anomaly",
    description:
      "Global mean surface temperature anomaly relative to pre-industrial baseline",
    thematicArea: "Atmosphere",
    dimensions: ["model", "experiment", "variant"],
    lastUpdated: "2025-04-07T15:30:00",
    executions: 24,
    chartType: "line",
  },
  {
    id: "metric-002",
    name: "Precipitation Patterns",
    description:
      "Spatial patterns of precipitation compared to observational data",
    thematicArea: "Atmosphere",
    dimensions: ["model", "experiment", "region"],
    lastUpdated: "2025-04-06T12:15:00",
    executions: 18,
    chartType: "bar",
  },
  {
    id: "metric-003",
    name: "Sea Ice Extent",
    description: "Arctic and Antarctic sea ice extent seasonal cycle",
    thematicArea: "Ocean & Sea Ice",
    dimensions: ["model", "experiment", "hemisphere", "month"],
    lastUpdated: "2025-04-05T09:45:00",
    executions: 16,
    chartType: "line",
  },
  {
    id: "metric-004",
    name: "Ocean Heat Content",
    description: "Change in ocean heat content by depth level",
    thematicArea: "Ocean & Sea Ice",
    dimensions: ["model", "experiment", "depth", "basin"],
    lastUpdated: "2025-04-04T14:20:00",
    executions: 12,
    chartType: "line",
  },
  {
    id: "metric-005",
    name: "Carbon Cycle Feedback",
    description: "Carbon cycle feedback parameters across models",
    thematicArea: "Earth System",
    dimensions: ["model", "experiment", "feedback_type"],
    lastUpdated: "2025-04-03T11:10:00",
    executions: 10,
    chartType: "bar",
  },
  {
    id: "metric-006",
    name: "Land Surface Albedo",
    description: "Seasonal cycle of land surface albedo by biome type",
    thematicArea: "Land & Land Ice",
    dimensions: ["model", "experiment", "biome", "season"],
    lastUpdated: "2025-04-02T16:40:00",
    executions: 14,
    chartType: "line",
  },
];

export function MetricsExplorer() {
  const [viewType, setViewType] = useState<"grid" | "table">("grid");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Available Metrics</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewType === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewType("grid")}
          >
            <PieChart className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewType === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewType("table")}
          >
            <Table className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      {viewType === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockMetrics.map((metric) => (
            <Card key={metric.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{metric.thematicArea}</Badge>
                  {metric.chartType === "line" ? (
                    <LineChart className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="text-lg">{metric.name}</CardTitle>
                <CardDescription>{metric.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Dimensions:</span>{" "}
                    {metric.dimensions.join(", ")}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Last updated:</span>{" "}
                    {new Date(metric.lastUpdated).toLocaleString()}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Executions:</span>{" "}
                    {metric.executions}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/metrics/${metric.id}`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-medium">Name</th>
                <th className="p-2 text-left font-medium">Thematic Area</th>
                <th className="p-2 text-left font-medium">Dimensions</th>
                <th className="p-2 text-left font-medium">Last Updated</th>
                <th className="p-2 text-left font-medium">Executions</th>
                <th className="p-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockMetrics.map((metric) => (
                <tr key={metric.id} className="border-b">
                  <td className="p-2">
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {metric.description}
                    </div>
                  </td>
                  <td className="p-2">
                    <Badge variant="outline">{metric.thematicArea}</Badge>
                  </td>
                  <td className="p-2">{metric.dimensions.join(", ")}</td>
                  <td className="p-2">
                    {new Date(metric.lastUpdated).toLocaleString()}
                  </td>
                  <td className="p-2">{metric.executions}</td>
                  <td className="p-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/explorer/metrics/${metric.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
