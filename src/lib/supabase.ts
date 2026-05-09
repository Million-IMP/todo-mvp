import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ✅ Auth API
export const authAPI = {
  signup: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
    return data
  },

  signin: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw new Error(error.message)
    return data.session
  },

  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) throw new Error(error.message)
    return data.session
  },
}

// ✅ Todo CRUD
export const todosAPI = {
  list: async (userId: string) => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  },

  create: async (userId: string, title: string, description: string) => {
    const { data, error } = await supabase
      .from('todos')
      .insert([{ user_id: userId, title, description }])
      .select()
    if (error) throw new Error(error.message)
    return data[0]
  },

  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id)
      .select()
    if (error) throw new Error(error.message)
    return data[0]
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  },
}
