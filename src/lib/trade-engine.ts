// ─── 费用常量 ─────────────────────────────────────

/** 买入手续费率：万 2.5 */
const BUY_FEE_RATE = 0.00025;
/** 卖出手续费率：万 2.5 */
const SELL_FEE_RATE = 0.00025;
/** 卖出印花税率：千 1 */
const STAMP_TAX_RATE = 0.001;
/** 手续费最低收取金额 */
const MIN_FEE = 5;
/** 涨跌停幅度（主板 10%，后续可配置） */
const DAILY_LIMIT_RATE = 0.10;

// ─── 费用计算 ─────────────────────────────────────

export interface FeeResult {
  fee: number;
  tax: number;
  totalCost: number;
  netAmount: number;
}

/**
 * 计算买入费用（万 2.5 手续费，最低 5 元，无印花税）
 */
export function calcBuyFee(grossAmount: number): FeeResult {
  let fee = grossAmount * BUY_FEE_RATE;
  if (fee < MIN_FEE) fee = MIN_FEE;
  fee = Math.round(fee * 100) / 100;

  const tax = 0;
  const totalCost = fee + tax;
  const netAmount = grossAmount + totalCost;

  return { fee, tax, totalCost, netAmount: Math.round(netAmount * 100) / 100 };
}

/**
 * 计算卖出费用（万 2.5 手续费最低 5 元 + 千 1 印花税）
 */
export function calcSellFee(grossAmount: number): FeeResult {
  let fee = grossAmount * SELL_FEE_RATE;
  if (fee < MIN_FEE) fee = MIN_FEE;
  fee = Math.round(fee * 100) / 100;

  const tax = Math.round(grossAmount * STAMP_TAX_RATE * 100) / 100;
  const totalCost = fee + tax;
  const netAmount = grossAmount - totalCost;

  return { fee, tax, totalCost, netAmount: Math.round(netAmount * 100) / 100 };
}

// ─── 持仓计算 ─────────────────────────────────────

export interface PositionInput {
  avgCost: number;
  quantity: number;
}

/**
 * 加权平均成本法：买入后更新平均成本
 */
export function calcAvgCost(
  currentPosition: PositionInput | null,
  buyPrice: number,
  buyQuantity: number
): { avgCost: number; quantity: number } {
  if (!currentPosition || currentPosition.quantity === 0) {
    return { avgCost: buyPrice, quantity: buyQuantity };
  }

  const totalCost =
    currentPosition.avgCost * currentPosition.quantity +
    buyPrice * buyQuantity;
  const totalQuantity = currentPosition.quantity + buyQuantity;

  return {
    avgCost: Math.round((totalCost / totalQuantity) * 1000) / 1000,
    quantity: totalQuantity,
  };
}

/**
 * 卖出后更新剩余持仓数量和成本（成本不变）
 */
export function calcSellPosition(
  currentPosition: PositionInput,
  sellQuantity: number
): { avgCost: number; quantity: number } | null {
  const remaining = currentPosition.quantity - sellQuantity;
  if (remaining <= 0) return null;
  return { avgCost: currentPosition.avgCost, quantity: remaining };
}

// ─── 盈亏计算 ─────────────────────────────────────

/**
 * 浮动盈亏
 */
export function calcPnl(
  avgCost: number,
  currentPrice: number,
  quantity: number
): { pnl: number; pnlRate: number } {
  const pnl = (currentPrice - avgCost) * quantity;
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlRate: avgCost > 0 ? Math.round(((currentPrice - avgCost) / avgCost) * 10000) / 100 : 0,
  };
}

/**
 * 已实现盈亏（平仓后）
 */
export function calcRealizedPnl(
  avgCost: number,
  sellPrice: number,
  sellQuantity: number,
  fee: number,
  tax: number
): number {
  const grossPnl = (sellPrice - avgCost) * sellQuantity;
  return Math.round((grossPnl - fee - tax) * 100) / 100;
}

// ─── 交易校验 ─────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * 校验买入委托
 */
export function validateBuyOrder(params: {
  availableCash: number;
  buyPrice: number;
  buyQuantity: number;
  preClose?: number;
  latestClose?: number;
}): ValidationResult {
  const { availableCash, buyPrice, buyQuantity, preClose, latestClose } =
    params;

  if (buyPrice <= 0) return { valid: false, reason: "价格必须大于 0" };
  if (buyQuantity <= 0 || !Number.isInteger(buyQuantity))
    return { valid: false, reason: "数量必须为正整数" };

  const { netAmount } = calcBuyFee(buyPrice * buyQuantity);

  if (netAmount > availableCash) {
    return {
      valid: false,
      reason: `资金不足：需要 ¥${netAmount.toFixed(2)}，可用 ¥${availableCash.toFixed(2)}`,
    };
  }

  // 涨停检查：买入价不应超过涨停价
  const referencePrice = preClose || latestClose;
  if (referencePrice && referencePrice > 0) {
    const limitUp = referencePrice * (1 + DAILY_LIMIT_RATE);
    if (buyPrice > limitUp) {
      return {
        valid: false,
        reason: `买入价超过涨停价 ¥${limitUp.toFixed(2)}`,
      };
    }
  }

  return { valid: true };
}

/**
 * 校验卖出委托
 */
export function validateSellOrder(params: {
  currentPosition: PositionInput | null;
  sellPrice: number;
  sellQuantity: number;
  preClose?: number;
  latestClose?: number;
}): ValidationResult {
  const { currentPosition, sellPrice, sellQuantity, preClose, latestClose } =
    params;

  if (sellPrice <= 0) return { valid: false, reason: "价格必须大于 0" };
  if (sellQuantity <= 0 || !Number.isInteger(sellQuantity))
    return { valid: false, reason: "数量必须为正整数" };

  if (!currentPosition || currentPosition.quantity <= 0) {
    return { valid: false, reason: "无可用持仓" };
  }

  if (sellQuantity > currentPosition.quantity) {
    return {
      valid: false,
      reason: `持仓不足：持有 ${currentPosition.quantity} 股，尝试卖出 ${sellQuantity} 股`,
    };
  }

  // 跌停检查：卖出价不应低于跌停价
  const referencePrice = preClose || latestClose;
  if (referencePrice && referencePrice > 0) {
    const limitDown = referencePrice * (1 - DAILY_LIMIT_RATE);
    if (sellPrice < limitDown) {
      return {
        valid: false,
        reason: `卖出价低于跌停价 ¥${limitDown.toFixed(2)}`,
      };
    }
  }

  return { valid: true };
}

/**
 * 检查是否有可用行情（停牌/无行情时拒绝交易）
 */
export function hasValidQuote(latestClose: number | null | undefined): boolean {
  return latestClose != null && latestClose > 0;
}
