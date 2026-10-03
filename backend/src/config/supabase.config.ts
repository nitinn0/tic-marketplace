import { registerAs } from '@nestjs/config';

export const supabaseConfig = registerAs('supabase', () => ({
  url: process.env.SUPABASE_URL ?? 'https://laleiwqwvomzsfrkyvnh.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY ?? '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
}));
