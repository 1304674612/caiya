"use client";

import { useEffect, useRef, useState } from "react";

interface KLineData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface KLineChartProps {
  data: KLineData[];
  height?: number;
}

export function KLineChart({ data, height = 500 }: KLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    setError(false);
    let cancelled = false;

    import("lightweight-charts")
      .then(({ createChart, CandlestickSeries, HistogramSeries }) => {
        if (cancelled || !containerRef.current) return;

        const container = containerRef.current;
        const chartHeight = height;

        const chart = createChart(container, {
          height: chartHeight,
          layout: {
            background: { color: "transparent" },
            textColor: "#6b7280",
            fontSize: 11,
            fontFamily: "Geist, -apple-system, sans-serif",
          },
          grid: {
            vertLines: { color: "#f3f4f6", style: 1 },
            horzLines: { color: "#f3f4f6", style: 1 },
          },
          crosshair: {
            mode: 1,
            vertLine: {
              color: "#9ca3af",
              width: 1,
              style: 2,
              labelBackgroundColor: "#6b7280",
            },
            horzLine: {
              color: "#9ca3af",
              width: 1,
              style: 2,
              labelBackgroundColor: "#6b7280",
            },
          },
          rightPriceScale: {
            borderColor: "#e5e7eb",
            scaleMargins: { top: 0.05, bottom: 0.25 },
            autoScale: true,
          },
          timeScale: {
            borderColor: "#e5e7eb",
            timeVisible: true,
            secondsVisible: false,
            tickMarkFormatter: (time: unknown) => {
              const d = new Date(time as number * 1000);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            },
          },
          handleScroll: { vertTouchDrag: false },
        });

        // Candlestick series
        const candleSeries = CandlestickSeries
          ? chart.addSeries(CandlestickSeries, {
              upColor: "#ef4444",
              downColor: "#22c55e",
              borderUpColor: "#ef4444",
              borderDownColor: "#22c55e",
              wickUpColor: "#ef4444",
              wickDownColor: "#22c55e",
            })
          : // @ts-expect-error legacy API fallback
            chart.addCandlestickSeries({
              upColor: "#ef4444",
              downColor: "#22c55e",
              borderUpColor: "#ef4444",
              borderDownColor: "#22c55e",
              wickUpColor: "#ef4444",
              wickDownColor: "#22c55e",
            });

        candleSeries.setData(
          data.map((d) => ({
            time: d.time as import("lightweight-charts").Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))
        );

        candleSeries.priceScale().applyOptions({
          autoScale: true,
        });

        // Volume histogram
        const volumeSeries = HistogramSeries
          ? chart.addSeries(HistogramSeries, {
              priceFormat: { type: "volume" },
              priceScaleId: "volume",
            })
          : // @ts-expect-error legacy fallback
            chart.addHistogramSeries({
              priceFormat: { type: "volume" },
              priceScaleId: "volume",
            });

        volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });

        volumeSeries.setData(
          data.map((d, i) => {
            const prevClose = i > 0 ? data[i - 1].close : d.open;
            return {
              time: d.time as import("lightweight-charts").Time,
              value: d.volume || 0,
              color: d.close >= prevClose ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.4)",
            };
          })
        );

        chart.timeScale().fitContent();

        // Resize handler
        const ro = new ResizeObserver(() => {
          chart.applyOptions({ width: container.clientWidth });
        });
        ro.observe(container);

        return () => {
          ro.disconnect();
          chart.remove();
        };
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [data, height]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400"
        style={{ height }}
      >
        图表加载失败，请刷新重试
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height }}
    />
  );
}
