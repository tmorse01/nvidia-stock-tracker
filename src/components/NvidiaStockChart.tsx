import { LineChart } from "@mantine/charts";
import {
  SegmentedControl,
  Stack,
  LoadingOverlay,
  Title,
  Text,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  getCachedData,
  setCachedData,
  isCacheExpired,
  getCacheKey,
  CACHE_NAME,
} from "../utils/cacheUtils";

type TimeRange = "1D" | "5D" | "1W" | "1M" | "1Y" | "5Y";

interface StockDataPoint {
  date: string;
  date_utc: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjclose: number;
}

interface StockResponse {
  meta: {
    processedTime: string;
    currency: string;
    symbol: string;
    // ... other meta fields
  };
  body: {
    [key: string]: StockDataPoint;
  };
}

type StockData = {
  date: string;
  value: number;
};

const transformData = (data: StockResponse) => {
  return Object.values(data.body).map((point) => ({
    date: new Date(point.date_utc * 1000).toISOString(),
    value: point.close,
  }));
};

export function NvidiaStockChart() {
  const [data, setData] = useState<StockData[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStockData = async () => {
      setIsLoading(true);
      try {
        const cacheKey = getCacheKey(CACHE_NAME, timeRange);
        const cachedData = await getCachedData(cacheKey);

        if (cachedData && !isCacheExpired(cachedData.timestamp)) {
          setData(transformData(cachedData.data));
          setIsLoading(false);
          return;
        }

        // Calculate the interval and period based on timeRange
        let interval = "1d";
        let period = "1mo";

        switch (timeRange) {
          case "1D":
            interval = "30m";
            period = "1d";
            break;
          case "5D":
            interval = "90m";
            period = "5d";
            break;
          case "1W":
            interval = "2h";
            period = "1w";
            break;
          case "1M":
            interval = "1d";
            period = "1mo";
            break;
          case "1Y":
            interval = "1wk";
            period = "12mo";
            break;
          case "5Y":
            interval = "1mo";
            period = "60mo";
            break;
        }

        // Add a small delay to help with rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));

        const response = await fetch(
          `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/history?symbol=NVDA&interval=${interval}&period=${period}`,
          {
            headers: {
              "X-RapidAPI-Key": import.meta.env.VITE_RAPIDAPI_KEY,
              "X-RapidAPI-Host": "yahoo-finance15.p.rapidapi.com",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`
          );
        }

        const apiData: StockResponse = await response.json();

        const transformedData = transformData(apiData);

        // Store in cache
        await setCachedData(cacheKey, {
          data: apiData,
          timestamp: Date.now(),
        });

        setData(transformedData);
      } catch (error) {
        console.error("Error fetching stock data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Set up polling for real-time updates
    fetchStockData();
    const pollInterval = setInterval(fetchStockData, 60000); // Poll every minute

    return () => clearInterval(pollInterval);
  }, [timeRange]);

  return (
    <Stack pos="relative" spacing="xs">
      <div>
        <Title order={2}>NVIDIA Corporation (NVDA)</Title>
        <Text size="sm" c="dimmed">
          Real-time stock price tracker with historical data
        </Text>
      </div>
      <LoadingOverlay
        visible={isLoading}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      <SegmentedControl
        value={timeRange}
        onChange={(value: TimeRange) => setTimeRange(value)}
        data={[
          { label: "1D", value: "1D" },
          { label: "5D", value: "5D" },
          { label: "1W", value: "1W" },
          { label: "1M", value: "1M" },
          { label: "1Y", value: "1Y" },
          { label: "5Y", value: "5Y" },
        ]}
      />
      <LineChart
        h={300}
        data={data}
        dataKey="date"
        series={[{ name: "value", color: "green.7" }]}
        tickLine="y"
        gridAxis="x"
        tooltipProps={{
          content: ({ payload }) => {
            if (payload && payload[0]) {
              return `$${payload[0].value.toFixed(2)}`;
            }
            return "";
          },
        }}
        yAxisProps={{
          tickFormatter: (value) => `$${value.toFixed(2)}`,
        }}
        xAxisProps={{
          tickFormatter: (value) => {
            const date = new Date(value);
            switch (timeRange) {
              case "1D":
              case "5D":
                return date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
              case "1W":
              case "1M":
                return date.toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                });
              default:
                return date.toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
            }
          },
          interval: "preserveStartEnd",
          tickCount: 8,
        }}
        loading={isLoading}
      />
    </Stack>
  );
}
