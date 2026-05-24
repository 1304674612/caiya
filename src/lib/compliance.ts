import { prisma } from "./prisma";

export const COMPLIANCE_KEYS = {
  RISK_DISCLAIMER: "risk_disclaimer",
  AI_POLICY: "ai_policy",
  TERMS_OF_SERVICE: "terms_of_service",
} as const;

export async function hasAcknowledged(
  userId: string,
  messageKey: string
): Promise<boolean> {
  const log = await prisma.complianceLog.findUnique({
    where: {
      userId_messageKey: {
        userId,
        messageKey,
      },
    },
  });
  return log !== null;
}

export async function acknowledge(
  userId: string,
  messageKey: string,
  messageVersion = "1.0"
) {
  await prisma.complianceLog.upsert({
    where: {
      userId_messageKey: {
        userId,
        messageKey,
      },
    },
    create: {
      userId,
      messageKey,
      messageVersion,
    },
    update: {
      messageVersion,
      acknowledgedAt: new Date(),
    },
  });

  if (messageKey === COMPLIANCE_KEYS.RISK_DISCLAIMER) {
    await prisma.user.update({
      where: { id: userId },
      data: { riskAcknowledgedAt: new Date() },
    });
  }
}
