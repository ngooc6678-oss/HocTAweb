import { createClient } from '../../../lib/supabase/server';
import { createWordHandlers } from '../../../lib/word-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const { GET, POST } = createWordHandlers(createClient);
