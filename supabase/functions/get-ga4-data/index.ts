import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { JWT } from "npm:google-auth-library";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const serviceAccountJson = Deno.env.get("GA4_SERVICE_ACCOUNT");
        const propertyId = Deno.env.get("GA4_PROPERTY_ID");

        if (!serviceAccountJson || !propertyId) {
            throw new Error("Missing GA4_SERVICE_ACCOUNT or GA4_PROPERTY_ID environment variables");
        }

        const serviceAccount = JSON.parse(serviceAccountJson);

        const client = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        });

        const token = await client.authorize();
        const accessToken = token.access_token;

        // 1. Fetch Trend Data (Last 7 Days)
        const trendResponse = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
                    dimensions: [{ name: "date" }],
                    metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
                    orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
                }),
            }
        );

        const trendData = await trendResponse.json();

        // 2. Fetch Acquisition Data
        const acquisitionResponse = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
                    dimensions: [{ name: "sessionSource" }],
                    metrics: [{ name: "activeUsers" }],
                    limit: 10,
                }),
            }
        );

        const acquisitionData = await acquisitionResponse.json();

        return new Response(
            JSON.stringify({
                trend: trendData,
                acquisition: acquisitionData
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("GA4 Analytics Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
