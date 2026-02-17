export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bmbg: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          phone: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          likes_count: number
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_friend_requests_receiver"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_friend_requests_sender"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      market: {
        Row: {
          created_at: string | null
          id: string
          price_per_share: number
          quantity: number
          seller_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          price_per_share: number
          quantity: number
          seller_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          price_per_share?: number
          quantity?: number
          seller_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          media_type: string
          media_url: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          media_type: string
          media_url: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          media_type?: string
          media_url?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category: string | null
          comments_count: number
          content: string | null
          created_at: string | null
          id: string
          likes_count: number
          media_url: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          comments_count?: number
          content?: string | null
          created_at?: string | null
          id?: string
          likes_count?: number
          media_url?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          comments_count?: number
          content?: string | null
          created_at?: string | null
          id?: string
          likes_count?: number
          media_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          created_at: string | null
          id: string
          quantity: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          quantity: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          quantity?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          approved_by_admin: boolean | null
          buyer_id: string | null
          created_at: string | null
          id: string
          quantity: number
          seller_id: string | null
          share_id: string | null
          total_price: number
        }
        Insert: {
          approved_by_admin?: boolean | null
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          quantity: number
          seller_id?: string | null
          share_id?: string | null
          total_price: number
        }
        Update: {
          approved_by_admin?: boolean | null
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          quantity?: number
          seller_id?: string | null
          share_id?: string | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "market"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          categories: string[] | null
          city: string | null
          country: string | null
          created_at: string | null
          facebook: string | null
          founder_admin: boolean | null
          full_name: string | null
          id: string
          instagram: string | null
          is_admin: boolean | null
          is_shareholder: boolean | null
          phone_number: string
          theme: string | null
          title: string | null
          viber: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          categories?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          facebook?: string | null
          founder_admin?: boolean | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_admin?: boolean | null
          is_shareholder?: boolean | null
          phone_number: string
          theme?: string | null
          title?: string | null
          viber?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          categories?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          facebook?: string | null
          founder_admin?: boolean | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_admin?: boolean | null
          is_shareholder?: boolean | null
          phone_number?: string
          theme?: string | null
          title?: string | null
          viber?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_user_public_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      check_admin_access: { Args: never; Returns: boolean }
      ensure_user_profile: {
        Args: never
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          categories: string[]
          city: string
          country: string
          created_at: string
          facebook: string
          founder_admin: boolean
          full_name: string
          has_password: boolean
          id: string
          instagram: string
          is_admin: boolean
          is_shareholder: boolean
          phone_number: string
          title: string
          viber: string
          website: string
        }[]
      }
      get_detailed_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          categories: string[]
          city: string
          country: string
          created_at: string
          facebook: string
          full_name: string
          id: string
          instagram: string
          is_shareholder: boolean
          title: string
          viber: string
          website: string
        }[]
      }
      get_minimal_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          is_shareholder: boolean
          title: string
        }[]
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          categories: string[]
          city: string
          country: string
          created_at: string
          facebook: string
          founder_admin: boolean
          full_name: string
          has_password: boolean
          id: string
          instagram: string
          is_admin: boolean
          is_shareholder: boolean
          phone_number: string
          title: string
          viber: string
          website: string
        }[]
      }
      get_safe_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          categories: string[]
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_shareholder: boolean
          title: string
        }[]
      }
      get_safe_public_profiles_by_ids: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          full_name: string
          id: string
          is_shareholder: boolean
          title: string
        }[]
      }
      get_specialists: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          categories: string[]
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          title: string
        }[]
      }
      get_user_by_phone: {
        Args: { _phone_number: string }
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          categories: string[]
          city: string
          country: string
          created_at: string
          facebook: string
          founder_admin: boolean
          full_name: string
          id: string
          instagram: string
          is_admin: boolean
          is_shareholder: boolean
          phone_number: string
          title: string
          viber: string
          website: string
        }[]
      }
      get_user_roles_array: { Args: { user_id: string }; Returns: string[] }
      get_users_for_admin: {
        Args: never
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          categories: string[]
          city: string
          country: string
          created_at: string
          email: string
          facebook: string
          founder_admin: boolean
          full_name: string
          has_password: boolean
          id: string
          instagram: string
          is_admin: boolean
          is_shareholder: boolean
          phone_number: string
          title: string
          viber: string
          website: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_user_admin: { Args: { _user_id: string }; Returns: boolean }
      search_users_public: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          is_shareholder: boolean
          title: string
        }[]
      }
      send_friend_request_notification: {
        Args: { p_receiver_id: string; p_sender_name: string }
        Returns: undefined
      }
      set_config: {
        Args: { parameter: string; value: string }
        Returns: undefined
      }
      set_current_user_context: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      set_founder_admin_status: { Args: never; Returns: undefined }
      user_exists_by_phone: {
        Args: { _phone_number: string }
        Returns: boolean
      }
      validate_user_credentials: {
        Args: { _input_password: string; _phone_number: string }
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          categories: string[]
          city: string
          country: string
          created_at: string
          facebook: string
          founder_admin: boolean
          full_name: string
          has_password: boolean
          id: string
          instagram: string
          is_admin: boolean
          is_shareholder: boolean
          phone_number: string
          title: string
          viber: string
          website: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "founder" | "shareholder" | "user" | "specialist"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "founder", "shareholder", "user", "specialist"],
    },
  },
} as const
