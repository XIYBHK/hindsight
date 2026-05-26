"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBank } from "@/lib/bank-context";
import { client, AuditLogEntry, AuditStatsBucket } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const ACTION_OPTIONS = [
  { value: "all", labelKey: "auditLogs.filters.allActions" },
  { value: "retain", labelKey: "operations.types.retain" },
  { value: "recall", labelKey: "navigation.recall" },
  { value: "reflect", labelKey: "navigation.reflect" },
  { value: "create_bank", labelKey: "auditLogs.actions.createBank" },
  { value: "update_bank", labelKey: "auditLogs.actions.updateBank" },
  { value: "delete_bank", labelKey: "bankActions.deleteBank" },
  { value: "clear_memories", labelKey: "auditLogs.actions.clearMemories" },
  { value: "consolidation", labelKey: "operations.types.consolidation" },
  { value: "batch_retain", labelKey: "auditLogs.actions.batchRetain" },
  { value: "create_mental_model", labelKey: "auditLogs.actions.createMentalModel" },
  { value: "refresh_mental_model", labelKey: "auditLogs.actions.refreshMentalModel" },
  { value: "delete_mental_model", labelKey: "auditLogs.actions.deleteMentalModel" },
  { value: "create_directive", labelKey: "auditLogs.actions.createDirective" },
  { value: "delete_directive", labelKey: "auditLogs.actions.deleteDirective" },
  { value: "file_convert_retain", labelKey: "operations.types.fileConvertRetain" },
  { value: "webhook_delivery", labelKey: "operations.types.webhookDelivery" },
];

const TRANSPORT_OPTIONS = [
  { value: "all", labelKey: "auditLogs.filters.allTransports" },
  { value: "http", labelKey: "auditLogs.transports.http" },
  { value: "mcp", labelKey: "auditLogs.transports.mcp" },
  { value: "system", labelKey: "auditLogs.transports.system" },
];

const PERIOD_OPTIONS = [
  { value: "1d", labelKey: "auditLogs.periods.today" },
  { value: "7d", labelKey: "auditLogs.periods.last7Days" },
  { value: "30d", labelKey: "auditLogs.periods.last30Days" },
];

const ACTION_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  ACTION_OPTIONS.filter((option) => option.value !== "all").map((option) => [
    option.value,
    option.labelKey,
  ])
);

const TRANSPORT_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  TRANSPORT_OPTIONS.filter((option) => option.value !== "all").map((option) => [
    option.value,
    option.labelKey,
  ])
);

function actionLabel(action: string, t: ReturnType<typeof useTranslation>["t"]): string {
  const key = ACTION_LABEL_KEYS[action];
  return key ? String(t(key)) : action;
}

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDateTime(ts: string | null, locale: string): string {
  if (!ts) return "—";
  const date = new Date(ts);
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatChartLabel(ts: string, trunc: string, locale: string): string {
  const date = new Date(ts);
  if (trunc === "hour") {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function TransportBadge({
  transport,
  t,
}: {
  transport: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const styles: Record<string, string> = {
    http: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    mcp: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    system: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };
  const labelKey = TRANSPORT_LABEL_KEYS[transport];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[transport] || styles.system}`}
    >
      {labelKey ? t(labelKey) : transport}
    </span>
  );
}

// ---- Chart Section ----

function AuditChart({ bankId }: { bankId: string }) {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState("7d");
  const [chartAction, setChartAction] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<AuditStatsBucket[]>([]);
  const [trunc, setTrunc] = useState("day");
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(
    async (p: string = period, a: string | null = chartAction) => {
      setLoading(true);
      try {
        const data = await client.getAuditLogStats(bankId, {
          period: p,
          action: a || undefined,
        });
        setBuckets(data.buckets || []);
        setTrunc(data.trunc || "day");
      } catch (error) {
        console.error("Error loading audit stats:", error);
      } finally {
        setLoading(false);
      }
    },
    [bankId, period, chartAction]
  );

  useEffect(() => {
    loadStats();
  }, [bankId]);

  const chartData = buckets.map((b) => ({
    time: formatChartLabel(b.time, trunc, i18n.language),
    total: b.total,
  }));

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 gap-3">
        <CardTitle className="text-sm font-semibold">{t("auditLogs.chart.title")}</CardTitle>
        <div className="flex gap-2">
          <Select
            value={chartAction || "all"}
            onValueChange={(v) => {
              const a = v === "all" ? null : v;
              setChartAction(a);
              loadStats(period, a);
            }}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setPeriod(opt.value);
                loadStats(opt.value, chartAction);
              }}
            >
              {t(opt.labelKey)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[120px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t("common.loading")}
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t("auditLogs.chart.empty")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    padding: "4px 8px",
                  }}
                  formatter={(value) => [value, t("auditLogs.chart.total")]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name={t("auditLogs.chart.total")}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Main Component ----

export function AuditLogsView() {
  const { t, i18n } = useTranslation();
  const { currentBank } = useBank();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [transportFilter, setTransportFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>("all");
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getDateRange = useCallback((range: string): { start_date?: string; end_date?: string } => {
    if (range === "all") return {};
    const now = new Date();
    const start = new Date();
    if (range === "1h") start.setHours(now.getHours() - 1);
    else if (range === "1d") start.setDate(now.getDate() - 1);
    else if (range === "7d") start.setDate(now.getDate() - 7);
    else if (range === "30d") start.setDate(now.getDate() - 30);
    return { start_date: start.toISOString() };
  }, []);

  const loadLogs = useCallback(
    async (
      newActionFilter: string | null = actionFilter,
      newTransportFilter: string | null = transportFilter,
      newDateRange: string = dateRange,
      newOffset: number = offset
    ) => {
      if (!currentBank) return;

      setLoading(true);
      try {
        const dates = getDateRange(newDateRange);
        const data = await client.listAuditLogs(currentBank, {
          action: newActionFilter || undefined,
          transport: newTransportFilter || undefined,
          start_date: dates.start_date,
          end_date: dates.end_date,
          limit,
          offset: newOffset,
        });
        setLogs(data.items || []);
        setTotal(data.total || 0);
      } catch (error) {
        console.error("Error loading audit logs:", error);
      } finally {
        setLoading(false);
      }
    },
    [currentBank, actionFilter, transportFilter, dateRange, offset, limit, getDateRange]
  );

  const handleActionFilterChange = (value: string) => {
    const filter = value === "all" ? null : value;
    setActionFilter(filter);
    setOffset(0);
    loadLogs(filter, transportFilter, dateRange, 0);
  };

  const handleTransportFilterChange = (value: string) => {
    const filter = value === "all" ? null : value;
    setTransportFilter(filter);
    setOffset(0);
    loadLogs(actionFilter, filter, dateRange, 0);
  };

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    setOffset(0);
    loadLogs(actionFilter, transportFilter, value, 0);
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    loadLogs(actionFilter, transportFilter, dateRange, newOffset);
  };

  const handleLogClick = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (currentBank) {
      loadLogs(actionFilter, transportFilter, dateRange, offset);
    }
  }, [currentBank]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (!currentBank) return null;

  return (
    <div className="space-y-6">
      {/* Chart */}
      <AuditChart bankId={currentBank} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={actionFilter || "all"} onValueChange={handleActionFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("auditLogs.filters.allActions")} />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={transportFilter || "all"} onValueChange={handleTransportFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("auditLogs.filters.allTransports")} />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
            {TRANSPORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">{t("auditLogs.dateRanges.allTime")}</SelectItem>
            <SelectItem value="1h">{t("auditLogs.dateRanges.lastHour")}</SelectItem>
            <SelectItem value="1d">{t("auditLogs.dateRanges.last24Hours")}</SelectItem>
            <SelectItem value="7d">{t("auditLogs.dateRanges.last7Days")}</SelectItem>
            <SelectItem value="30d">{t("auditLogs.dateRanges.last30Days")}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadLogs(actionFilter, transportFilter, dateRange, offset)}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          {t("common.actions.refresh")}
        </Button>

        <span className="text-sm text-muted-foreground ml-auto">
          {t("auditLogs.count", { count: total })}
        </span>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">{t("auditLogs.columns.time")}</TableHead>
            <TableHead>{t("auditLogs.columns.action")}</TableHead>
            <TableHead className="w-[100px]">{t("auditLogs.columns.transport")}</TableHead>
            <TableHead className="w-[100px]">{t("auditLogs.columns.duration")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                {loading ? t("common.loading") : t("auditLogs.empty")}
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleLogClick(log)}
              >
                <TableCell className="text-sm font-mono">
                  {formatDateTime(log.started_at, i18n.language)}
                </TableCell>
                <TableCell className="font-medium">{actionLabel(log.action, t)}</TableCell>
                <TableCell>
                  <TransportBadge transport={log.transport} t={t} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono">
                  {formatDuration(log.started_at, log.ended_at)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("auditLogs.pagination.page", { current: currentPage, total: totalPages })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t("common.actions.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(offset + limit)}
              disabled={offset + limit >= total}
            >
              {t("common.actions.next")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("auditLogs.detail.title", {
                action: selectedLog ? actionLabel(selectedLog.action, t) : "",
              })}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("auditLogs.detail.action")}:</span>{" "}
                  <span className="font-medium">{actionLabel(selectedLog.action, t)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("auditLogs.detail.transport")}:</span>{" "}
                  <TransportBadge transport={selectedLog.transport} t={t} />
                </div>
                <div>
                  <span className="text-muted-foreground">{t("auditLogs.detail.started")}:</span>{" "}
                  <span className="font-mono">
                    {formatDateTime(selectedLog.started_at, i18n.language)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("auditLogs.detail.duration")}:</span>{" "}
                  <span className="font-mono">
                    {formatDuration(selectedLog.started_at, selectedLog.ended_at)}
                  </span>
                </div>
              </div>

              {selectedLog.request && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">{t("auditLogs.detail.request")}</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                    {JSON.stringify(selectedLog.request, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.response && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">{t("auditLogs.detail.response")}</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                    {JSON.stringify(selectedLog.response, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">{t("auditLogs.detail.metadata")}</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
