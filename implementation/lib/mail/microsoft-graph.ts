import { getEnv, hasEnv } from "@/lib/env";

function required(name: string) {
  const value = getEnv(name);

  if (!value) {
    throw new Error(`Manglende miljøvariabel: ${name}`);
  }

  return value;
}

export function hasMicrosoftGraphMailConfig() {
  return (
    hasEnv("MICROSOFT_GRAPH_TENANT_ID") &&
    hasEnv("MICROSOFT_GRAPH_CLIENT_ID") &&
    hasEnv("MICROSOFT_GRAPH_CLIENT_SECRET") &&
    hasEnv("MICROSOFT_GRAPH_SENDER_USER_ID")
  );
}

async function getAccessToken() {
  const tenantId = required("MICROSOFT_GRAPH_TENANT_ID");
  const clientId = required("MICROSOFT_GRAPH_CLIENT_ID");
  const clientSecret = required("MICROSOFT_GRAPH_CLIENT_SECRET");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  const data = (await response.json()) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "Kunne ikke hente adgangstoken fra Microsoft Graph."
    );
  }

  return data.access_token;
}

export async function sendMailViaMicrosoftGraph(params: {
  to: string;
  subject: string;
  body: string;
}) {
  const senderUserId = required("MICROSOFT_GRAPH_SENDER_USER_ID");
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderUserId)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: params.subject,
          body: {
            contentType: "Text",
            content: params.body,
          },
          toRecipients: [
            {
              emailAddress: {
                address: params.to,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Microsoft Graph afviste at sende mailen.");
  }
}
