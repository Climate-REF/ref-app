import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { BoxWhiskerShape } from "./boxWhiskerShape.tsx";
import { createScaledTickFormatter } from "./series/utils.ts";
import type {
  BoxPlot,
  GroupedRawDataEntry,
  ProcessedGroupedDataEntry,
} from "./types"; // Import new types

// Helper to generate distinct colors (replace with a proper palette if needed)
const defaultColors = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#d0ed57",
  "#a4de6c",
];
const getColor = (index: number): string =>
  defaultColors[index % defaultColors.length];

interface CustomGroupedBoxPlotChartProps {
  data: GroupedRawDataEntry[];
  width?: number | string;
  height?: number | string;
  className?: string;
  // Optional: Define explicit colors for groups
  groupColors?: { [groupName: string]: string };
}

const calculateMedian = (sortedArr: number[]): number => {
  const n = sortedArr.length;
  const midIndex = Math.floor(n / 2);

  if (n % 2 === 0) {
    // Even number of elements: average the two middle elements
    return (sortedArr[midIndex - 1] + sortedArr[midIndex]) / 2;
  }

  return sortedArr[midIndex];
};

export const calculateBoxPlotData = (values: number[]): BoxPlot => {
  // Doesn't modify the original data
  const sortedData = [...values].sort((a, b) => a - b);
  const n = sortedData.length;

  const min = sortedData[0];
  const max = sortedData[n - 1];

  const median = calculateMedian(sortedData);

  let lowerHalf: number[];
  let upperHalf: number[];
  const midIndex = Math.floor(n / 2);

  if (n % 2 === 0) {
    // Even number of elements: split exactly in half
    lowerHalf = sortedData.slice(0, midIndex);
    upperHalf = sortedData.slice(midIndex);
  } else {
    // Odd number of elements: exclude the median
    lowerHalf = sortedData.slice(0, midIndex);
    upperHalf = sortedData.slice(midIndex + 1);
  }

  const lowerQuartile = calculateMedian(lowerHalf);
  const upperQuartile = calculateMedian(upperHalf);

  return {
    min,
    lowerQuartile,
    median,
    upperQuartile,
    max,
    values: sortedData, // Add values back to BoxPlot
  };
};

export const GroupedBoxWhiskerChart = ({
  data,
  width = "100%",
  height = 400, // Increased default height often needed for grouped plots
  className,
  groupColors = {},
}: CustomGroupedBoxPlotChartProps) => {
  // 1. Identify all unique group names across the dataset & assign colors
  const groupMeta = useMemo(() => {
    const names = new Set<string>();
    for (const entry of data) {
      for (const group of entry.groups) {
        names.add(group.label);
      }
    }

    const sortedNames = Array.from(names).sort(); // Ensure consistent order
    const colors: { [key: string]: string } = {};
    sortedNames.forEach((name, index) => {
      colors[name] = groupColors[name] || getColor(index);
    });
    return { names: sortedNames, colors };
  }, [data, groupColors]);

  // 2. Process Raw Data: Flatten group stats into single objects per category
  const processedData = useMemo((): ProcessedGroupedDataEntry[] => {
    return data.map((entry) => {
      const processedEntry: ProcessedGroupedDataEntry = {
        name: entry.name,
        groups: {},
      };
      for (const group of entry.groups) {
        processedEntry.groups[group.label] = calculateBoxPlotData(group.values);
      }
      return processedEntry;
    });
  }, [data]);

  // 3. Calculate Y-Axis Domain Dynamically across all groups
  const yDomain = useMemo((): [number, number] => {
    let overallMin = Number.POSITIVE_INFINITY;
    let overallMax = Number.NEGATIVE_INFINITY;
    for (const entry of processedData) {
      for (const groupName of groupMeta.names) {
        const groupData = entry.groups[groupName];
        if (groupData) {
          if (!Number.isNaN(groupData.min) && groupData.min < overallMin)
            overallMin = groupData.min;
          if (!Number.isNaN(groupData.max) && groupData.max > overallMax)
            overallMax = groupData.max;
        }
      }
    }

    if (
      overallMin === Number.POSITIVE_INFINITY ||
      overallMax === Number.NEGATIVE_INFINITY
    ) {
      return [0, 100]; // Default domain if no valid data
    }

    const padding = Math.abs(overallMax - overallMin) * 0.1 || 10;
    return [Math.floor(overallMin - padding), Math.ceil(overallMax + padding)];
  }, [processedData, groupMeta.names]);

  if (processedData.length === 0 || groupMeta.names.length === 0) {
    return (
      <div
        style={{ width, height }}
        className={`flex items-center justify-center text-gray-500 ${className}`}
      >
        No data available
      </div>
    );
  }

  // Smart tick formatter based on data range
  const tickFormatter = createScaledTickFormatter(yDomain);

  return (
    <div style={{ width, height }} className={className}>
      <ResponsiveContainer className="h-[200px] w-full">
        <ComposedChart
          data={processedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }} // Increased bottom margin for legend
          // Adjust spacing between bars/groups if needed
          // barCategoryGap="20%" // Gap between categories (X-axis ticks)
          // barGap={4} // Gap between bars within the same category
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis
            domain={yDomain}
            allowDataOverflow={true}
            tickFormatter={tickFormatter}
          />
          {/*<Tooltip*/}
          {/*  content={<CustomGroupedTooltip groupMeta={groupMeta} />}*/}
          {/*  cursor={{ fill: "rgba(206, 206, 206, 0.2)" }}*/}
          {/*/>*/}
          <Legend verticalAlign="bottom" />

          {groupMeta.names.map((groupName) => (
            <Bar
              key={groupName}
              dataKey={(d: ProcessedGroupedDataEntry) => {
                return d.groups[groupName]?.median;
              }}
              name={groupName}
              fill={groupMeta.colors[groupName]}
              shape={<BoxWhiskerShape prefix={groupName} yDomain={yDomain} />}
              isAnimationActive={false}
              // barSize={30} // Optionally set a fixed size
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
