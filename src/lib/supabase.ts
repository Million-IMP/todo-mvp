import { createClient } from '@supabase/supabase-js'
import { Todo, Subtask, Recurrence } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

export const todosAPI = {
  list: async (userId: string): Promise<Todo[]> => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as Todo[]) ?? []
  },

  create: async (userId: string, fields: {
    title: string
    description?: string
    priority?: string
    due_date?: string | null
    start_time?: string | null
    end_time?: string | null
    category?: string
    tags?: string[]
    subtasks?: Subtask[]
    recurrence?: Recurrence | null
  }): Promise<Todo> => {
    const { data, error } = await supabase
      .from('todos')
      .insert([{
        user_id: userId,
        title: fields.title,
        description: fields.description || '',
        completed: false,
        priority: fields.priority ?? 'medium',
        due_date: fields.due_date ?? null,
        start_time: fields.start_time ?? null,
        end_time: fields.end_time ?? null,
        category: fields.category ?? 'personal',
        tags: fields.tags ?? [],
        sort_order: 0,
        subtasks: fields.subtasks ?? [],
        recurrence: fields.recurrence ?? null,
      }])
      .select()
    if (error) throw new Error(error.message)
    return data[0] as Todo
  },

  update: async (id: string, updates: Partial<Todo>): Promise<Todo> => {
    const { data, error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id)
      .select()
    if (error) throw new Error(error.message)
    return data[0] as Todo
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  updateSortOrders: async (updates: { id: string; sort_order: number }[]): Promise<void> => {
    const promises = updates.map(({ id, sort_order }) =>
      supabase.from('todos').update({ sort_order }).eq('id', id)
    );
    await Promise.all(promises);
  },
  };

