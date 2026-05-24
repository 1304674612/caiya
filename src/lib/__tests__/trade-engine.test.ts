import { describe, it, expect } from "vitest";
import {
  calcBuyFee,
  calcSellFee,
  calcAvgCost,
  calcSellPosition,
  calcPnl,
  calcRealizedPnl,
  validateBuyOrder,
  validateSellOrder,
  hasValidQuote,
} from "../trade-engine";

// ─── 费用计算 ───────────────────────────────────

describe("calcBuyFee", () => {
  it("万 2.5 费率计算", () => {
    const result = calcBuyFee(10000); // 1 万元成交
    expect(result.fee).toBe(5); // 10000 * 0.00025 = 2.5，最低 5 元
    expect(result.tax).toBe(0); // 买入无印花税
    expect(result.netAmount).toBe(10005);
  });

  it("大额成交按实际费率", () => {
    const result = calcBuyFee(100000); // 10 万元成交
    expect(result.fee).toBe(25); // 100000 * 0.00025 = 25
    expect(result.netAmount).toBe(100025);
  });

  it("最低手续费 5 元", () => {
    const result = calcBuyFee(100); // 100 元成交
    expect(result.fee).toBe(5); // 100 * 0.00025 = 0.025，不足 5 元按 5 元
    expect(result.netAmount).toBe(105);
  });

  it("精度保留两位小数", () => {
    const result = calcBuyFee(33333);
    expect(result.fee.toString()).toMatch(/^\d+\.\d{2}$/);
  });
});

describe("calcSellFee", () => {
  it("万 2.5 手续费 + 千 1 印花税", () => {
    const result = calcSellFee(10000);
    expect(result.fee).toBe(5); // 最低 5 元
    expect(result.tax).toBe(10); // 10000 * 0.001 = 10
    expect(result.netAmount).toBe(9985); // 10000 - 5 - 10
  });

  it("大额卖出费用", () => {
    const result = calcSellFee(100000);
    expect(result.fee).toBe(25);
    expect(result.tax).toBe(100);
    expect(result.netAmount).toBe(99875);
  });
});

// ─── 持仓计算 ───────────────────────────────────

describe("calcAvgCost", () => {
  it("首次买入", () => {
    const result = calcAvgCost(null, 10, 100);
    expect(result.avgCost).toBe(10);
    expect(result.quantity).toBe(100);
  });

  it("加权平均成本：同价加仓", () => {
    const result = calcAvgCost({ avgCost: 10, quantity: 100 }, 10, 100);
    expect(result.avgCost).toBe(10);
    expect(result.quantity).toBe(200);
  });

  it("加权平均成本：低价加仓摊薄", () => {
    // 初始 100 股 × 10 元 = 1000 元
    // 加仓 100 股 × 8 元 = 800 元
    // 总成本 1800 / 200 股 = 9 元
    const result = calcAvgCost({ avgCost: 10, quantity: 100 }, 8, 100);
    expect(result.avgCost).toBe(9);
    expect(result.quantity).toBe(200);
  });

  it("加权平均成本：高价加仓抬高", () => {
    const result = calcAvgCost({ avgCost: 10, quantity: 100 }, 12, 200);
    expect(result.avgCost).toBe(11.333); // (1000+2400)/300
    expect(result.quantity).toBe(300);
  });

  it("空仓买入", () => {
    const result = calcAvgCost({ avgCost: 0, quantity: 0 }, 10, 100);
    expect(result.avgCost).toBe(10);
    expect(result.quantity).toBe(100);
  });
});

describe("calcSellPosition", () => {
  it("部分卖出", () => {
    const result = calcSellPosition({ avgCost: 10, quantity: 200 }, 100);
    expect(result).not.toBeNull();
    expect(result!.avgCost).toBe(10); // 成本不变
    expect(result!.quantity).toBe(100);
  });

  it("全部卖出返回 null", () => {
    const result = calcSellPosition({ avgCost: 10, quantity: 100 }, 100);
    expect(result).toBeNull();
  });

  it("卖出超过持仓返回 null", () => {
    const result = calcSellPosition({ avgCost: 10, quantity: 50 }, 100);
    expect(result).toBeNull();
  });
});

// ─── 盈亏计算 ───────────────────────────────────

describe("calcPnl", () => {
  it("盈利", () => {
    const result = calcPnl(10, 12, 100);
    expect(result.pnl).toBe(200); // (12-10) * 100
    expect(result.pnlRate).toBe(20); // 20%
  });

  it("亏损", () => {
    const result = calcPnl(10, 8, 100);
    expect(result.pnl).toBe(-200);
    expect(result.pnlRate).toBe(-20);
  });

  it("持平", () => {
    const result = calcPnl(10, 10, 100);
    expect(result.pnl).toBe(0);
    expect(result.pnlRate).toBe(0);
  });

  it("成本为 0 时收益率为 0", () => {
    const result = calcPnl(0, 10, 100);
    expect(result.pnlRate).toBe(0);
  });
});

describe("calcRealizedPnl", () => {
  it("卖出盈利扣除费用", () => {
    // (12-10) * 100 - 5(手续费) - 1.2(印花税) = 193.8
    const result = calcRealizedPnl(10, 12, 100, 5, 1.2);
    expect(result).toBe(193.8);
  });

  it("卖出亏损加上费用", () => {
    // (8-10) * 100 - 5 - 0.8 = -205.8
    const result = calcRealizedPnl(10, 8, 100, 5, 0.8);
    expect(result).toBe(-205.8);
  });
});

// ─── 交易校验 ───────────────────────────────────

describe("validateBuyOrder", () => {
  it("正常买入通过", () => {
    const result = validateBuyOrder({
      availableCash: 100000,
      buyPrice: 10,
      buyQuantity: 100,
    });
    expect(result.valid).toBe(true);
  });

  it("价格为 0 拒绝", () => {
    const result = validateBuyOrder({
      availableCash: 100000,
      buyPrice: 0,
      buyQuantity: 100,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("价格必须大于 0");
  });

  it("数量不是整数拒绝", () => {
    const result = validateBuyOrder({
      availableCash: 100000,
      buyPrice: 10,
      buyQuantity: 1.5,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("整数");
  });

  it("资金不足拒绝", () => {
    const result = validateBuyOrder({
      availableCash: 500,
      buyPrice: 10,
      buyQuantity: 100,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("资金不足");
  });

  it("超过涨停价拒绝", () => {
    const result = validateBuyOrder({
      availableCash: 100000,
      buyPrice: 12,
      buyQuantity: 100,
      preClose: 10,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("涨停价");
  });

  it("涨停价挂单允许", () => {
    const result = validateBuyOrder({
      availableCash: 100000,
      buyPrice: 11, // 10 * 1.1 = 11
      buyQuantity: 100,
      preClose: 10,
    });
    expect(result.valid).toBe(true);
  });
});

describe("validateSellOrder", () => {
  it("正常卖出通过", () => {
    const result = validateSellOrder({
      currentPosition: { avgCost: 10, quantity: 200 },
      sellPrice: 12,
      sellQuantity: 100,
    });
    expect(result.valid).toBe(true);
  });

  it("无持仓拒绝", () => {
    const result = validateSellOrder({
      currentPosition: null,
      sellPrice: 10,
      sellQuantity: 100,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("无可用持仓");
  });

  it("持仓不足拒绝", () => {
    const result = validateSellOrder({
      currentPosition: { avgCost: 10, quantity: 50 },
      sellPrice: 10,
      sellQuantity: 100,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("持仓不足");
  });

  it("低于跌停价拒绝", () => {
    const result = validateSellOrder({
      currentPosition: { avgCost: 10, quantity: 200 },
      sellPrice: 8.5,
      sellQuantity: 100,
      preClose: 10,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("跌停价");
  });

  it("跌停价挂单允许", () => {
    const result = validateSellOrder({
      currentPosition: { avgCost: 10, quantity: 200 },
      sellPrice: 9, // 10 * 0.9 = 9
      sellQuantity: 100,
      preClose: 10,
    });
    expect(result.valid).toBe(true);
  });
});

// ─── 行情校验 ───────────────────────────────────

describe("hasValidQuote", () => {
  it("有效行情", () => {
    expect(hasValidQuote(13.5)).toBe(true);
  });

  it("null 无效", () => {
    expect(hasValidQuote(null)).toBe(false);
  });

  it("undefined 无效", () => {
    expect(hasValidQuote(undefined)).toBe(false);
  });

  it("0 无效（停牌）", () => {
    expect(hasValidQuote(0)).toBe(false);
  });
});
