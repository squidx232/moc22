import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Check user approval status endpoint
http.route({
  path: "/check-user-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { email } = await request.json();
    
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const status = await ctx.runQuery(api.userSignup.checkUserApprovalStatus, { email });
    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
