import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if requesting user is owner
    const { data: isOwner, error: ownerError } = await supabaseAdmin.rpc("is_owner", {
      _user_id: user.id,
    });

    if (ownerError || !isOwner) {
      throw new Error("Only owners can delete users");
    }

    // Parse request body
    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      throw new Error("Missing userId in request");
    }

    // Check if target user is NOT an owner (can't delete owners)
    const { data: targetIsOwner, error: targetOwnerError } = await supabaseAdmin.rpc("is_owner", {
      _user_id: userId,
    });

    if (targetOwnerError) {
      throw new Error("Failed to check target user role");
    }

    if (targetIsOwner) {
      throw new Error("Cannot delete owner accounts");
    }

    console.log(`Owner ${user.email} deleting user ${userId}`);

    // Delete the user from auth.users (this will cascade to profiles, user_roles, user_limits)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Failed to delete user:", deleteError);
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    console.log(`User ${userId} deleted successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "User deleted successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Delete user error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
