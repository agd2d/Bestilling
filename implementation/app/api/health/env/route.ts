import { NextResponse } from "next/server";
import { getEnvStatus, isDevAuthBypassed } from "../../../../lib/env";

export async function GET() {
  const env = getEnvStatus();

  return NextResponse.json({
    success: true,
    ready: env.every((row) => row.present),
    devBypassAuth: isDevAuthBypassed(),
    env,
  });
}
