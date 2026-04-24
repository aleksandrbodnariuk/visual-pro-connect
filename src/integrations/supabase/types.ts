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
      analytics_events: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          device_type: string | null
          event_type: string
          id: string
          language: string | null
          occurred_at: string
          path: string
          ref_domain: string | null
          region: string | null
          session_id: string
          timezone: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          device_type?: string | null
          event_type?: string
          id?: string
          language?: string | null
          occurred_at?: string
          path: string
          ref_domain?: string | null
          region?: string | null
          session_id: string
          timezone?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          device_type?: string | null
          event_type?: string
          id?: string
          language?: string | null
          occurred_at?: string
          path?: string
          ref_domain?: string | null
          region?: string | null
          session_id?: string
          timezone?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      asset_categories: {
        Row: {
          created_at: string
          id: string
          included_in_valuation: boolean
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          included_in_valuation?: boolean
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          included_in_valuation?: boolean
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      asset_items: {
        Row: {
          acquired_at: string | null
          category_id: string
          condition: string | null
          created_at: string
          description: string | null
          id: string
          included_in_valuation: boolean
          name: string
          quantity: number
          total_price: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          acquired_at?: string | null
          category_id: string
          condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          included_in_valuation?: boolean
          name: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          acquired_at?: string | null
          category_id?: string
          condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          included_in_valuation?: boolean
          name?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_valuation_snapshots: {
        Row: {
          calculated_share_price: number
          created_at: string
          created_by: string | null
          id: string
          label: string
          notes: string | null
          total_asset_value: number
          total_shares: number
        }
        Insert: {
          calculated_share_price?: number
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          notes?: string | null
          total_asset_value?: number
          total_shares?: number
        }
        Update: {
          calculated_share_price?: number
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          notes?: string | null
          total_asset_value?: number
          total_shares?: number
        }
        Relationships: []
      }
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
      calculation_snapshots: {
        Row: {
          admin_fund_12_5: number
          confirmed_orders_count: number
          created_at: string
          created_by: string | null
          custom_from: string | null
          custom_to: string | null
          id: string
          notes: string | null
          period_label: string
          period_type: string
          share_price_usd_snapshot: number | null
          shareholders_pool_20: number
          snapshot_payload: Json
          specialists_pool_50: number
          title_bonus_pool_17_5: number
          total_amount: number
          total_expenses: number
          total_net_profit: number
          total_shares_snapshot: number | null
        }
        Insert: {
          admin_fund_12_5?: number
          confirmed_orders_count: number
          created_at?: string
          created_by?: string | null
          custom_from?: string | null
          custom_to?: string | null
          id?: string
          notes?: string | null
          period_label: string
          period_type: string
          share_price_usd_snapshot?: number | null
          shareholders_pool_20?: number
          snapshot_payload?: Json
          specialists_pool_50?: number
          title_bonus_pool_17_5?: number
          total_amount?: number
          total_expenses?: number
          total_net_profit?: number
          total_shares_snapshot?: number | null
        }
        Update: {
          admin_fund_12_5?: number
          confirmed_orders_count?: number
          created_at?: string
          created_by?: string | null
          custom_from?: string | null
          custom_to?: string | null
          id?: string
          notes?: string | null
          period_label?: string
          period_type?: string
          share_price_usd_snapshot?: number | null
          shareholders_pool_20?: number
          snapshot_payload?: Json
          specialists_pool_50?: number
          title_bonus_pool_17_5?: number
          total_amount?: number
          total_expenses?: number
          total_net_profit?: number
          total_shares_snapshot?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_visible: boolean
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id: string
          is_visible?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_visible?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      certificate_purchase_requests: {
        Row: {
          admin_note: string | null
          amount_uah: number
          approved_at: string | null
          approved_by: string | null
          buyer_id: string
          buyer_note: string | null
          certificate_id: string | null
          created_at: string
          discount_percent: number
          id: string
          is_gift: boolean
          recipient_id: string | null
          recipient_phone: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount_uah: number
          approved_at?: string | null
          approved_by?: string | null
          buyer_id: string
          buyer_note?: string | null
          certificate_id?: string | null
          created_at?: string
          discount_percent: number
          id?: string
          is_gift?: boolean
          recipient_id?: string | null
          recipient_phone?: string | null
          status?: string
          tier: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount_uah?: number
          approved_at?: string | null
          approved_by?: string | null
          buyer_id?: string
          buyer_note?: string | null
          certificate_id?: string | null
          created_at?: string
          discount_percent?: number
          id?: string
          is_gift?: boolean
          recipient_id?: string | null
          recipient_phone?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_purchase_requests_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "user_certificates"
            referencedColumns: ["id"]
          },
        ]
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
      company_settings: {
        Row: {
          id: string
          share_price_usd: number
          total_shares: number
          unallocated_funds: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          share_price_usd?: number
          total_shares?: number
          unallocated_funds?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          share_price_usd?: number
          total_shares?: number
          unallocated_funds?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          is_archived: boolean
          is_muted: boolean
          joined_at: string
          last_read_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_archived?: boolean
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_archived?: boolean
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_message_at: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_message_at?: string
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_message_at?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_audit_log: {
        Row: {
          created_at: string
          id: string
          net_profit: number
          order_id: string
          representatives_total: number
          shareholders_total: number
          unallocated_added: number
          unallocated_used: number
        }
        Insert: {
          created_at?: string
          id?: string
          net_profit?: number
          order_id: string
          representatives_total?: number
          shareholders_total?: number
          unallocated_added?: number
          unallocated_used?: number
        }
        Update: {
          created_at?: string
          id?: string
          net_profit?: number
          order_id?: string
          representatives_total?: number
          shareholders_total?: number
          unallocated_added?: number
          unallocated_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_audit_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "specialist_orders"
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
          buyer_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          price_per_share: number
          quantity: number
          remaining_qty: number
          seller_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          price_per_share: number
          quantity: number
          remaining_qty: number
          seller_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          price_per_share?: number
          quantity?: number
          remaining_qty?: number
          seller_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_visible: boolean
          label: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id: string
          is_visible?: boolean
          label: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_visible?: boolean
          label?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listing_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_cover: boolean
          listing_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_cover?: boolean
          listing_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_cover?: boolean
          listing_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category_id: string
          city: string | null
          condition: string
          contact_method: string | null
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          deal_type: string
          description: string | null
          id: string
          is_negotiable: boolean
          is_vip_boost: boolean
          price: number
          status: string
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          category_id: string
          city?: string | null
          condition?: string
          contact_method?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          deal_type?: string
          description?: string | null
          id?: string
          is_negotiable?: boolean
          is_vip_boost?: boolean
          price?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          category_id?: string
          city?: string | null
          condition?: string
          contact_method?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          deal_type?: string
          description?: string | null
          id?: string
          is_negotiable?: boolean
          is_vip_boost?: boolean
          price?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reservations: {
        Row: {
          buyer_id: string
          buyer_note: string | null
          created_at: string
          id: string
          listing_id: string
          seller_id: string
          seller_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_note?: string | null
          created_at?: string
          id?: string
          listing_id: string
          seller_id: string
          seller_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_note?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          seller_id?: string
          seller_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reservations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
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
          conversation_id: string | null
          created_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          read: boolean | null
          receiver_id: string | null
          sender_id: string
          system_event: Json | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          read?: boolean | null
          receiver_id?: string | null
          sender_id: string
          system_event?: Json | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          read?: boolean | null
          receiver_id?: string | null
          sender_id?: string
          system_event?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action_type: string
          comment_id: string | null
          created_at: string
          id: string
          moderator_id: string
          post_id: string | null
          reason: string
          target_user_id: string
        }
        Insert: {
          action_type?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          moderator_id: string
          post_id?: string | null
          reason: string
          target_user_id: string
        }
        Update: {
          action_type?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          moderator_id?: string
          post_id?: string | null
          reason?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
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
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          media_display_url: string | null
          media_preview_url: string | null
          media_type: string
          media_url: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          media_display_url?: string | null
          media_preview_url?: string | null
          media_type: string
          media_url: string
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          media_display_url?: string | null
          media_preview_url?: string | null
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
      portfolio_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_system: boolean
          is_visible: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id: string
          is_system?: boolean
          is_visible?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_system?: boolean
          is_visible?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      representative_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          percent: number
          representative_id: string
          role_snapshot: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          order_id: string
          percent?: number
          representative_id: string
          role_snapshot: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          percent?: number
          representative_id?: string
          role_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "representative_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "specialist_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_earnings_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_invites: {
        Row: {
          created_at: string
          id: string
          invited_user_id: string
          inviter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_user_id: string
          inviter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_user_id?: string
          inviter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "representative_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_payouts: {
        Row: {
          admin_notes: string | null
          amount: number
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          order_ids: string[]
          paid_at: string | null
          paid_by: string | null
          percent_at_calculation: number
          representative_id: string
          role_at_calculation: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_ids?: string[]
          paid_at?: string | null
          paid_by?: string | null
          percent_at_calculation?: number
          representative_id: string
          role_at_calculation?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_ids?: string[]
          paid_at?: string | null
          paid_by?: string | null
          percent_at_calculation?: number
          representative_id?: string
          role_at_calculation?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "representative_payouts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representative_payouts_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      representatives: {
        Row: {
          created_at: string
          id: string
          parent_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "representatives_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representatives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          service_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          service_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          service_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      share_transfer_log: {
        Row: {
          confirmed_by: string | null
          created_at: string
          from_user_id: string
          id: string
          listing_id: string | null
          note: string | null
          price_per_share_usd: number
          shares_qty: number
          to_user_id: string
          total_amount_usd: number
          transaction_id: string | null
        }
        Insert: {
          confirmed_by?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          listing_id?: string | null
          note?: string | null
          price_per_share_usd?: number
          shares_qty: number
          to_user_id: string
          total_amount_usd?: number
          transaction_id?: string | null
        }
        Update: {
          confirmed_by?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          listing_id?: string | null
          note?: string | null
          price_per_share_usd?: number
          shares_qty?: number
          to_user_id?: string
          total_amount_usd?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_transfer_log_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "market"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transfer_log_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      shareholder_payouts: {
        Row: {
          admin_notes: string | null
          amount: number
          base_income: number
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          order_ids: string[]
          paid_at: string | null
          paid_by: string | null
          reminder_sent_at: string | null
          share_percent_at_calculation: number
          shareholder_id: string
          shares_at_calculation: number
          status: string
          title_at_calculation: string | null
          title_bonus: number
          total_shares_snapshot: number
        }
        Insert: {
          admin_notes?: string | null
          amount?: number
          base_income?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_ids?: string[]
          paid_at?: string | null
          paid_by?: string | null
          reminder_sent_at?: string | null
          share_percent_at_calculation?: number
          shareholder_id: string
          shares_at_calculation?: number
          status?: string
          title_at_calculation?: string | null
          title_bonus?: number
          total_shares_snapshot?: number
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          base_income?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_ids?: string[]
          paid_at?: string | null
          paid_by?: string | null
          reminder_sent_at?: string | null
          share_percent_at_calculation?: number
          shareholder_id?: string
          shares_at_calculation?: number
          status?: string
          title_at_calculation?: string | null
          title_bonus?: number
          total_shares_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "shareholder_payouts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shareholder_payouts_shareholder_id_fkey"
            columns: ["shareholder_id"]
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
            isOneToOne: true
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
      site_visits: {
        Row: {
          id: string
          user_id: string | null
          visit_date: string
          visited_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          visit_date?: string
          visited_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          visit_date?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_order_participants: {
        Row: {
          created_at: string
          id: string
          order_id: string
          role: string
          specialist_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          role?: string
          specialist_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          role?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_order_participants_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "specialist_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_orders: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          financial_notes: string | null
          financials_updated_at: string | null
          id: string
          notes: string | null
          order_amount: number | null
          order_date: string
          order_expenses: number | null
          order_type: string
          price: number | null
          representative_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          financial_notes?: string | null
          financials_updated_at?: string | null
          id?: string
          notes?: string | null
          order_amount?: number | null
          order_date: string
          order_expenses?: number | null
          order_type?: string
          price?: number | null
          representative_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          financial_notes?: string | null
          financials_updated_at?: string | null
          id?: string
          notes?: string | null
          order_amount?: number | null
          order_date?: string
          order_expenses?: number | null
          order_type?: string
          price?: number | null
          representative_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_orders_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_payouts: {
        Row: {
          admin_notes: string | null
          amount: number
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          paid_at: string | null
          paid_by: string | null
          role_at_calculation: string | null
          specialist_id: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          paid_at?: string | null
          paid_by?: string | null
          role_at_calculation?: string | null
          specialist_id: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          paid_at?: string | null
          paid_by?: string | null
          role_at_calculation?: string | null
          specialist_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_payouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "specialist_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_payouts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_payouts_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          attachment_url: string | null
          category: string
          closed_at: string | null
          created_at: string
          id: string
          message: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          attachment_url?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          attachment_url?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          approved_by_admin: boolean | null
          buyer_id: string | null
          created_at: string | null
          id: string
          price_per_share: number | null
          quantity: number
          seller_id: string | null
          share_id: string | null
          status: string
          total_price: number
          updated_at: string | null
        }
        Insert: {
          approved_by_admin?: boolean | null
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          price_per_share?: number | null
          quantity: number
          seller_id?: string | null
          share_id?: string | null
          status?: string
          total_price: number
          updated_at?: string | null
        }
        Update: {
          approved_by_admin?: boolean | null
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          price_per_share?: number | null
          quantity?: number
          seller_id?: string | null
          share_id?: string | null
          status?: string
          total_price?: number
          updated_at?: string | null
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
      user_certificates: {
        Row: {
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          is_gift: boolean
          issued_by: string | null
          note: string | null
          purchase_amount_uah: number | null
          purchased_by: string | null
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          is_gift?: boolean
          issued_by?: string | null
          note?: string | null
          purchase_amount_uah?: number | null
          purchased_by?: string | null
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          is_gift?: boolean
          issued_by?: string | null
          note?: string | null
          purchase_amount_uah?: number | null
          purchased_by?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_files: {
        Row: {
          created_at: string | null
          file_type: string
          file_url: string
          folder_id: string | null
          id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_type?: string
          file_url: string
          folder_id?: string | null
          id?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_type?: string
          file_url?: string
          folder_id?: string | null
          id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "user_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
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
      user_vip_memberships: {
        Row: {
          created_at: string
          custom_banner_url: string | null
          custom_name_color: string | null
          expires_at: string | null
          granted_by: string | null
          id: string
          is_lifetime: boolean
          last_birthday_gift_year: number | null
          last_monthly_bonus_at: string | null
          started_at: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_banner_url?: string | null
          custom_name_color?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          is_lifetime?: boolean
          last_birthday_gift_year?: number | null
          last_monthly_bonus_at?: string | null
          started_at?: string
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_banner_url?: string | null
          custom_name_color?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          is_lifetime?: boolean
          last_birthday_gift_year?: number | null
          last_monthly_bonus_at?: string | null
          started_at?: string
          tier?: string
          updated_at?: string
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
          date_of_birth: string | null
          facebook: string | null
          founder_admin: boolean | null
          full_name: string | null
          id: string
          instagram: string | null
          is_admin: boolean | null
          is_blocked: boolean | null
          is_shareholder: boolean | null
          last_seen: string | null
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
          date_of_birth?: string | null
          facebook?: string | null
          founder_admin?: boolean | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_admin?: boolean | null
          is_blocked?: boolean | null
          is_shareholder?: boolean | null
          last_seen?: string | null
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
          date_of_birth?: string | null
          facebook?: string | null
          founder_admin?: boolean | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_admin?: boolean | null
          is_blocked?: boolean | null
          is_shareholder?: boolean | null
          last_seen?: string | null
          phone_number?: string
          theme?: string | null
          title?: string | null
          viber?: string | null
          website?: string | null
        }
        Relationships: []
      }
      vip_events: {
        Row: {
          color: string
          created_at: string
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          linked_order_id: string | null
          location: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          linked_order_id?: string | null
          location?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          linked_order_id?: string | null
          location?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_purchase_requests: {
        Row: {
          admin_note: string | null
          amount_uah: number
          approved_at: string | null
          approved_by: string | null
          buyer_id: string
          buyer_note: string | null
          created_at: string
          duration_days: number
          id: string
          is_gift: boolean
          membership_id: string | null
          recipient_id: string | null
          recipient_phone: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount_uah: number
          approved_at?: string | null
          approved_by?: string | null
          buyer_id: string
          buyer_note?: string | null
          created_at?: string
          duration_days: number
          id?: string
          is_gift?: boolean
          membership_id?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          status?: string
          tier: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount_uah?: number
          approved_at?: string | null
          approved_by?: string | null
          buyer_id?: string
          buyer_note?: string | null
          created_at?: string
          duration_days?: number
          id?: string
          is_gift?: boolean
          membership_id?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      vip_reminders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          notified_at: string | null
          push_enabled: boolean
          remind_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          notified_at?: string | null
          push_enabled?: boolean
          remind_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          notified_at?: string | null
          push_enabled?: boolean
          remind_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_tiers: {
        Row: {
          badge_icon: string
          banner_animation: string
          birthday_bonus_uah: number
          created_at: string
          description: string | null
          discount_percent: number
          duration_days: number
          gradient: string
          highlight: boolean
          id: string
          is_active: boolean
          label: string
          monthly_bonus_uah: number
          name_color: string | null
          perks: Json
          price_uah: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge_icon?: string
          banner_animation?: string
          birthday_bonus_uah?: number
          created_at?: string
          description?: string | null
          discount_percent?: number
          duration_days?: number
          gradient?: string
          highlight?: boolean
          id: string
          is_active?: boolean
          label: string
          monthly_bonus_uah?: number
          name_color?: string | null
          perks?: Json
          price_uah?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge_icon?: string
          banner_animation?: string
          birthday_bonus_uah?: number
          created_at?: string
          description?: string | null
          discount_percent?: number
          duration_days?: number
          gradient?: string
          highlight?: boolean
          id?: string
          is_active?: boolean
          label?: string
          monthly_bonus_uah?: number
          name_color?: string | null
          perks?: Json
          price_uah?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_representative_invite: {
        Args: { _invite_id: string }
        Returns: undefined
      }
      add_members_to_group: {
        Args: { _conv_id: string; _user_ids: string[] }
        Returns: undefined
      }
      admin_force_confirm_payout: {
        Args: { _payout_id: string }
        Returns: undefined
      }
      admin_force_confirm_rep_payout: {
        Args: { _payout_id: string }
        Returns: undefined
      }
      admin_force_confirm_spec_payout: {
        Args: { _payout_id: string }
        Returns: undefined
      }
      approve_certificate_purchase: {
        Args: { _admin_note?: string; _request_id: string }
        Returns: undefined
      }
      approve_share_transaction: {
        Args: { _transaction_id: string }
        Returns: undefined
      }
      approve_vip_purchase: {
        Args: { _admin_note?: string; _request_id: string }
        Returns: string
      }
      assign_default_role: { Args: { _user_id: string }; Returns: undefined }
      can_access_user_public_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      cancel_share_transaction: {
        Args: { _transaction_id: string }
        Returns: undefined
      }
      check_admin_access: { Args: never; Returns: boolean }
      claim_vip_birthday_gift: { Args: { _user_id: string }; Returns: Json }
      claim_vip_monthly_bonus: { Args: { _user_id: string }; Returns: Json }
      confirm_payout: { Args: { _payout_id: string }; Returns: undefined }
      confirm_rep_payout: { Args: { _payout_id: string }; Returns: undefined }
      confirm_spec_payout: { Args: { _payout_id: string }; Returns: undefined }
      create_group_conversation: {
        Args: { _member_ids: string[]; _title: string }
        Returns: string
      }
      create_share_listing: {
        Args: { _note?: string; _quantity: number }
        Returns: string
      }
      create_stock_notification: {
        Args: { _link?: string; _message: string; _user_id: string }
        Returns: undefined
      }
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
      get_all_shareholders_shares: {
        Args: never
        Returns: {
          quantity: number
          user_id: string
        }[]
      }
      get_analytics_overview:
        | {
            Args: {
              _country_filter?: string
              _end_date: string
              _path_filter?: string
              _start_date: string
            }
            Returns: {
              daily_stats: Json
              top_countries: Json
              top_pages: Json
              top_sources: Json
              total_pageviews: number
              total_sessions: number
              unique_visitors: number
            }[]
          }
        | {
            Args: {
              _country_filter?: string
              _end_date: string
              _path_filter?: string
              _start_date: string
              _traffic_filter?: string
            }
            Returns: {
              daily_stats: Json
              top_countries: Json
              top_pages: Json
              top_sources: Json
              total_pageviews: number
              total_sessions: number
              unique_visitors: number
            }[]
          }
      get_confirmed_orders_for_forecast: {
        Args: never
        Returns: {
          id: string
          order_amount: number
          order_date: string
          order_expenses: number
          status: string
          title: string
        }[]
      }
      get_conversation_member_role: {
        Args: { _conv_id: string; _user_id: string }
        Returns: string
      }
      get_conversion_stats: {
        Args: never
        Returns: {
          confirmed_orders: number
          conversion_rate: number
          total_orders: number
          total_profit: number
          total_revenue: number
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
      get_financial_audit_log: {
        Args: { _order_id?: string }
        Returns: {
          created_at: string
          id: string
          net_profit: number
          order_id: string
          representatives_total: number
          shareholders_total: number
          unallocated_added: number
          unallocated_used: number
        }[]
        SetofOptions: {
          from: "*"
          to: "financial_audit_log"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_financial_stats: {
        Args: { _period?: string }
        Returns: {
          total_orders: number
          total_profit: number
          total_representatives_paid: number
          total_shareholders_paid: number
          total_unallocated: number
        }[]
      }
      get_issued_shares_count: { Args: never; Returns: number }
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
      get_my_representative_stats: {
        Args: never
        Returns: {
          avg_check: number
          orders_count: number
          team_size: number
          total_earnings: number
        }[]
      }
      get_or_create_direct_conversation: {
        Args: { _other_user_id: string }
        Returns: string
      }
      get_representative_stats: {
        Args: { _user_id: string }
        Returns: {
          avg_check: number
          orders_count: number
          team_size: number
          total_earnings: number
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
      get_team_tree: {
        Args: { _representative_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          level: number
          parent_id: string
          role: string
          user_id: string
        }[]
      }
      get_title_by_share_percent: {
        Args: { _percent: number }
        Returns: string
      }
      get_top_representatives: {
        Args: { _period?: string }
        Returns: {
          avatar_url: string
          earnings: number
          full_name: string
          orders_count: number
          user_id: string
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
      get_user_conversations: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          conversation_id: string
          description: string
          last_message_at: string
          last_message_text: string
          member_count: number
          member_ids: string[]
          my_role: string
          title: string
          type: string
          unread_count: number
        }[]
      }
      get_user_friends: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      get_user_roles_array: { Args: { user_id: string }; Returns: string[] }
      get_user_vip_tier: { Args: { _user_id: string }; Returns: string }
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
          email_confirmed_at: string
          facebook: string
          founder_admin: boolean
          full_name: string
          has_password: boolean
          id: string
          instagram: string
          is_admin: boolean
          is_blocked: boolean
          is_shareholder: boolean
          last_seen: string
          phone_number: string
          title: string
          viber: string
          website: string
        }[]
      }
      get_users_last_seen: {
        Args: { _ids: string[] }
        Returns: {
          id: string
          last_seen: string
        }[]
      }
      get_vip_discount_percent: { Args: { _user_id: string }; Returns: number }
      get_visit_stats: {
        Args: never
        Returns: {
          visits_month: number
          visits_today: number
          visits_year: number
        }[]
      }
      has_active_vip: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_stock_market_access: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_conversation_member: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      is_order_creator: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_order_participant: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_admin: { Args: { _user_id: string }; Returns: boolean }
      leave_conversation: { Args: { _conv_id: string }; Returns: undefined }
      mark_conversation_read: { Args: { _conv_id: string }; Returns: undefined }
      mark_payout_paid: {
        Args: { _admin_notes?: string; _payout_id: string }
        Returns: undefined
      }
      mark_rep_payout_paid: {
        Args: { _admin_notes?: string; _payout_id: string }
        Returns: undefined
      }
      mark_spec_payout_paid: {
        Args: { _admin_notes?: string; _payout_id: string }
        Returns: undefined
      }
      notify_admins_stock_event: {
        Args: { _link?: string; _message: string }
        Returns: undefined
      }
      process_order_profit: { Args: { _order_id: string }; Returns: Json }
      record_visit: { Args: never; Returns: undefined }
      reject_certificate_purchase: {
        Args: { _admin_note?: string; _request_id: string }
        Returns: undefined
      }
      reject_share_transaction: {
        Args: { _transaction_id: string }
        Returns: undefined
      }
      remove_member_from_group: {
        Args: { _conv_id: string; _user_id: string }
        Returns: undefined
      }
      search_marketplace_listings: {
        Args: {
          p_category_id?: string
          p_city?: string
          p_condition?: string
          p_deal_type?: string
          p_limit?: number
          p_max_price?: number
          p_min_price?: number
          p_search?: string
          p_sort_by?: string
        }
        Returns: {
          category_id: string
          city: string | null
          condition: string
          contact_method: string | null
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          deal_type: string
          description: string | null
          id: string
          is_negotiable: boolean
          is_vip_boost: boolean
          price: number
          status: string
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
          views_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "marketplace_listings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
      set_stock_market_access: {
        Args: { _access: string; _user_id: string }
        Returns: undefined
      }
      sync_all_shareholder_titles: { Args: never; Returns: undefined }
      sync_user_title: { Args: { _user_id: string }; Returns: undefined }
      update_conversation_avatar: {
        Args: { _avatar_url: string; _conv_id: string }
        Returns: undefined
      }
      update_conversation_description: {
        Args: { _conv_id: string; _description: string }
        Returns: undefined
      }
      update_conversation_title: {
        Args: { _conv_id: string; _title: string }
        Returns: undefined
      }
      update_member_role: {
        Args: { _conv_id: string; _new_role: string; _user_id: string }
        Returns: undefined
      }
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
      app_role:
        | "admin"
        | "founder"
        | "shareholder"
        | "user"
        | "specialist"
        | "moderator"
        | "candidate"
        | "representative"
        | "manager"
        | "director"
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
      app_role: [
        "admin",
        "founder",
        "shareholder",
        "user",
        "specialist",
        "moderator",
        "candidate",
        "representative",
        "manager",
        "director",
      ],
    },
  },
} as const
