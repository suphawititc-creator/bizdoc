import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rnyxyqcblgboopcesvew.supabase.co'
const SUPABASE_KEY = 'sb_publishable_cHbkM-idEHXyDvbRxfCtvQ__L83mCY9'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── helpers ──────────────────────────────────────────────────────────────────
export async function loadDocs() {
  const { data, error } = await supabase
    .from('documents')
    .select('id, type, data')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(row => ({ ...row.data, id: row.id, type: row.type }))
}

export async function saveDoc(doc) {
  const { error } = await supabase
    .from('documents')
    .upsert({ id: String(doc.id), type: doc.type, data: doc, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function deleteDoc(id) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', String(id))
  if (error) throw error
}
