import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://sekmjwrbohjmlxpgydqx.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNla21qd3Jib2hqbWx4cGd5ZHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mjc3MzEsImV4cCI6MjEwMzMwMzczMX0.xoIaSypPELSYmqbHXlrSeV2XArZ4jLQGhOv15iCrzSo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
