import { Injectable } from "@nestjs/common";
import {
  createClient,
  SupabaseClient,
} from "@supabase/supabase-js";

@Injectable()
export class SupabaseAdminService {
  readonly client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const serviceRole =
      process.env.SUPABASE_SERVICE_ROLE_KEY!;

    this.client = createClient(
      url,
      serviceRole,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }
}
