// Ambient Deno & remote URL import shims for IDE TypeScript checking of Supabase Edge Functions.
// Runtime tetap memakai Deno native di Supabase Edge Functions.

declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
  };
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.4' {
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, any>
  ): {
    rpc: (fn: string, params?: Record<string, any>) => Promise<{ data: any; error: { message: string } | null }>;
  };
}
