export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          code: string
          host_id: string
          status: 'waiting' | 'playing' | 'voting' | 'finished'
          max_players: number
          rounds_before_vote: number
          undercover_count: number
          mister_white_count: number
          current_round: number
          current_turn_index: number
          turn_order: string[]
          civilian_word: string | null
          undercover_word: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          host_id: string
          status?: 'waiting' | 'playing' | 'voting' | 'finished'
          max_players?: number
          rounds_before_vote?: number
          undercover_count?: number
          mister_white_count?: number
          current_round?: number
          current_turn_index?: number
          turn_order?: string[]
          civilian_word?: string | null
          undercover_word?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['games']['Insert']>
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          user_id: string
          username: string
          role: 'civilian' | 'undercover' | 'mister_white' | null
          word: string | null
          is_eliminated: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          username: string
          role?: 'civilian' | 'undercover' | 'mister_white' | null
          word?: string | null
          is_eliminated?: boolean
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['game_players']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          username: string
          avatar_emoji: string
          games_played: number
          games_won: number
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_emoji?: string
          games_played?: number
          games_won?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
    }
  }
}
