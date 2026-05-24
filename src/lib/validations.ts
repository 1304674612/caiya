import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "昵称不能为空").max(50, "昵称最长 50 个字符"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位字符").max(100, "密码最长 100 位字符"),
});

export const tradeSchema = z.object({
  stockCode: z.string().length(6, "股票代码必须为 6 位").regex(/^\d{6}$/, "股票代码格式不正确"),
  stockName: z.string().max(50).optional(),
  type: z.enum(["buy", "sell"], { message: "交易类型必须为 buy 或 sell" }),
  price: z.number().positive("价格必须大于 0"),
  quantity: z.number().int("数量必须为整数").positive("数量必须为正整数"),
});

export const acknowledgeSchema = z.object({
  messageKey: z.enum(["risk_disclaimer", "ai_policy", "terms_of_service"], {
    message: "无效的消息类型",
  }),
});

export const stockQuerySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/).optional(),
  keyword: z.string().max(20).optional(),
  type: z.enum(["daily", "intraday"]).optional(),
  range: z.enum(["7d", "30d", "90d", "1y", "2y"]).optional(),
  action: z.enum(["list"]).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type TradeInput = z.infer<typeof tradeSchema>;
