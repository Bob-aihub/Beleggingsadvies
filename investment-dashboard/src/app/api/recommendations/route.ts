import { NextResponse } from "next/server";
import { getRecommendations, TAX_REFERENCE } from "@/lib/recommendations";
import { getAppConfig } from "@/lib/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const horizon = searchParams.get("horizon") ?? undefined;
  const config = getAppConfig();

  return NextResponse.json({
    demo: config.demoMode,
    recommendations: getRecommendations(horizon),
    taxReference: TAX_REFERENCE,
  });
}
