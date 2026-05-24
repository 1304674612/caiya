import type { User, Session } from "next-auth";

// ─── NextAuth 扩展类型 ────────────────────────────

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      riskAcknowledgedAt?: Date | null;
    };
  }
}

// ─── 交易相关 ─────────────────────────────────────

export interface TradeOrder {
  stockCode: string;
  stockName?: string;
  type: "buy" | "sell";
  price: number;
  quantity: number;
}

export interface PositionSummary {
  stockCode: string;
  stockName?: string;
  avgCost: number;
  quantity: number;
  marketValue: number;
  profit: number;
  profitRate: number;
}

// ─── 行情数据 ─────────────────────────────────────

export interface StockQuote {
  code: string;
  name?: string;
  latestPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  preClose: number;
  volume: number;
}

export interface KLineData {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ─── 论坛 ─────────────────────────────────────────

export type PostCategory = "discussion" | "review" | "blog";
export type PostStatus = "pending" | "published" | "hidden";

export interface PostFormData {
  title: string;
  content: string;
  category: PostCategory;
  tags?: string[];
}

// ─── AI 相关 ──────────────────────────────────────

export type AIProvider = "openai" | "claude" | "custom";

export interface AITemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
}
