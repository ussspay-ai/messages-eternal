import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Agent Prompts] Supabase credentials not configured. Agent prompts will not be saved.')
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Initialize database schema if needed
async function ensureTableExists() {
  if (!supabase) {
    console.warn('[Agent Prompts] Supabase not configured, skipping table check')
    return
  }

  try {
    // Try to query the table
    const { error } = await supabase
      .from('agent_prompts')
      .select('agent_id')
      .limit(1)

    if (error?.code === 'PGRST116') {
      // Table doesn't exist, create it
      console.log('[Agent Prompts] Creating agent_prompts table...')
      
      // Try to use RPC if available
      try {
        const { error: createError } = await supabase.rpc('create_agent_prompts_table', {})
        if (createError) {
          console.log('[Agent Prompts] RPC not available, table creation will be handled on demand')
        }
      } catch (rpcErr) {
        console.log('[Agent Prompts] RPC call failed, will retry on demand:', rpcErr)
      }
    }
  } catch (err) {
    console.error('[Agent Prompts] Error ensuring table exists:', err)
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return Response.json({ success: false, error: 'Wallet address required' }, { status: 400 })
    }

    if (!supabase) {
      console.warn('[Agent Prompts API] Supabase not configured')
      return Response.json({
        success: true,
        agent_prompts: {},
        count: 0,
        warning: 'Supabase not configured. Configure SUPABASE_URL and SUPABASE_SERVICE_KEY to enable agent prompts.'
      })
    }

    // Ensure table exists
    await ensureTableExists()

    // Fetch agent prompts from database
    const { data: prompts, error } = await supabase
      .from('agent_prompts')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      // If table doesn't exist, provide helpful message
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.error('[Agent Prompts] Table does not exist. Run migration: supabase-migrations-agent-prompts.sql')
        return Response.json({ 
          success: false, 
          error: 'Agent prompts table not initialized. Please run the database migration.',
          setup_instruction: 'Run supabase-migrations-agent-prompts.sql in your Supabase dashboard SQL editor'
        }, { status: 503 })
      }
      throw error
    }

    // Format response by agent ID
    const promptsByAgent: Record<string, any> = {}
    prompts?.forEach((p: any) => {
      promptsByAgent[p.agent_id] = {
        agent_id: p.agent_id,
        agent_name: p.agent_name,
        current_prompt: p.current_prompt,
        previous_prompt: p.previous_prompt,
        updated_at: p.updated_at,
        updated_by: p.updated_by,
      }
    })

    return Response.json({
      success: true,
      agent_prompts: promptsByAgent,
      count: prompts?.length || 0,
    })
  } catch (error: any) {
    console.error('[Agent Prompts API] Error fetching prompts:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { wallet, agent_id, agent_name, new_prompt } = body

    if (!wallet || !agent_id || !new_prompt) {
      return Response.json(
        { success: false, error: 'Missing required fields: wallet, agent_id, new_prompt' },
        { status: 400 }
      )
    }

    if (!supabase) {
      console.warn('[Agent Prompts API] Supabase not configured, cannot save prompt')
      return Response.json({
        success: false,
        error: 'Agent prompts feature is not available. Configure SUPABASE_URL and SUPABASE_SERVICE_KEY to enable.',
        setup_instruction: 'Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables'
      }, { status: 503 })
    }

    // Ensure table exists before writing
    await ensureTableExists()

    // First, get the current prompt (if it exists) to save as previous
    const { data: existingPrompt, error: selectError } = await supabase
      .from('agent_prompts')
      .select('current_prompt')
      .eq('agent_id', agent_id)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      // Check if it's a table doesn't exist error
      if (selectError.code === 'PGRST116' || selectError.message?.includes('does not exist')) {
        return Response.json({ 
          success: false, 
          error: 'Agent prompts table not initialized. Please run the database migration.',
          setup_instruction: 'Run supabase-migrations-agent-prompts.sql in your Supabase dashboard SQL editor'
        }, { status: 503 })
      }
    }

    const previousPrompt = existingPrompt?.current_prompt || null

    // Upsert the new prompt
    const { data, error: upsertError } = await supabase
      .from('agent_prompts')
      .upsert(
        {
          agent_id,
          agent_name: agent_name || agent_id,
          current_prompt: new_prompt,
          previous_prompt: previousPrompt,
          updated_by: wallet,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'agent_id',
        }
      )
      .select()

    if (upsertError) throw upsertError

    return Response.json({
      success: true,
      message: 'Agent prompt updated successfully',
      prompt: data?.[0],
    })
  } catch (error: any) {
    console.error('[Agent Prompts API] Error updating prompt:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}