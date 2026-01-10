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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_subscriptions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          payment_confirmed_at: string | null
          payment_notes: string | null
          plan_id: string
          starts_at: string | null
          status: string
          tiktok_account_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_confirmed_at?: string | null
          payment_notes?: string | null
          plan_id: string
          starts_at?: string | null
          status?: string
          tiktok_account_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_confirmed_at?: string | null
          payment_notes?: string | null
          plan_id?: string
          starts_at?: string | null
          status?: string
          tiktok_account_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_subscriptions_tiktok_account_id_fkey"
            columns: ["tiktok_account_id"]
            isOneToOne: true
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      apify_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          dataset_id: string | null
          error_message: string | null
          id: string
          run_id: string
          status: string
          tiktok_account_id: string
          user_id: string
          videos_imported: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dataset_id?: string | null
          error_message?: string | null
          id?: string
          run_id: string
          status?: string
          tiktok_account_id: string
          user_id: string
          videos_imported?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dataset_id?: string | null
          error_message?: string | null
          id?: string
          run_id?: string
          status?: string
          tiktok_account_id?: string
          user_id?: string
          videos_imported?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "apify_runs_tiktok_account_id_fkey"
            columns: ["tiktok_account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pending_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          pending_balance: number | null
          role: string | null
          tiktok_username: string | null
          total_earnings: number | null
          updated_at: string
          user_id: string
          videos_uploaded: number | null
          welcome_email_sent: boolean | null
          youtube_channel_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          pending_balance?: number | null
          role?: string | null
          tiktok_username?: string | null
          total_earnings?: number | null
          updated_at?: string
          user_id: string
          videos_uploaded?: number | null
          welcome_email_sent?: boolean | null
          youtube_channel_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          pending_balance?: number | null
          role?: string | null
          tiktok_username?: string | null
          total_earnings?: number | null
          updated_at?: string
          user_id?: string
          videos_uploaded?: number | null
          welcome_email_sent?: boolean | null
          youtube_channel_url?: string | null
        }
        Relationships: []
      }
      publish_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          max_retries: number | null
          processed_at: string | null
          progress_percentage: number | null
          progress_phase: string | null
          retry_count: number | null
          schedule_id: string | null
          scheduled_for: string
          scraped_video_id: string
          started_at: string | null
          status: string | null
          updated_at: string
          user_id: string
          youtube_channel_id: string
          youtube_video_id: string | null
          youtube_video_url: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          processed_at?: string | null
          progress_percentage?: number | null
          progress_phase?: string | null
          retry_count?: number | null
          schedule_id?: string | null
          scheduled_for: string
          scraped_video_id: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          youtube_channel_id: string
          youtube_video_id?: string | null
          youtube_video_url?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          processed_at?: string | null
          progress_percentage?: number | null
          progress_phase?: string | null
          retry_count?: number | null
          schedule_id?: string | null
          scheduled_for?: string
          scraped_video_id?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          youtube_channel_id?: string
          youtube_video_id?: string | null
          youtube_video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publish_queue_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "publish_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_queue_scraped_video_id_fkey"
            columns: ["scraped_video_id"]
            isOneToOne: false
            referencedRelation: "scraped_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_queue_youtube_channel_id_fkey"
            columns: ["youtube_channel_id"]
            isOneToOne: false
            referencedRelation: "youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_schedules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          publish_times: Json
          schedule_name: string
          tiktok_account_id: string
          timezone: string | null
          updated_at: string
          user_id: string
          videos_per_day: number | null
          youtube_channel_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          publish_times?: Json
          schedule_name: string
          tiktok_account_id: string
          timezone?: string | null
          updated_at?: string
          user_id: string
          videos_per_day?: number | null
          youtube_channel_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          publish_times?: Json
          schedule_name?: string
          tiktok_account_id?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
          videos_per_day?: number | null
          youtube_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_schedules_tiktok_account_id_fkey"
            columns: ["tiktok_account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_schedules_youtube_channel_id_fkey"
            columns: ["youtube_channel_id"]
            isOneToOne: false
            referencedRelation: "youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          max_attempts: number | null
          priority: number | null
          scheduled_at: string
          started_at: string | null
          status: string
          tiktok_account_id: string
          updated_at: string
          user_id: string
          videos_found: number | null
          videos_imported: number | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          priority?: number | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          tiktok_account_id: string
          updated_at?: string
          user_id: string
          videos_found?: number | null
          videos_imported?: number | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          priority?: number | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          tiktok_account_id?: string
          updated_at?: string
          user_id?: string
          videos_found?: number | null
          videos_imported?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_queue_tiktok_account_id_fkey"
            columns: ["tiktok_account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_videos: {
        Row: {
          comment_count: number | null
          created_at: string
          description: string | null
          download_url: string | null
          duration: number | null
          id: string
          is_downloaded: boolean | null
          is_published: boolean | null
          like_count: number | null
          published_at: string | null
          scraped_at: string
          share_count: number | null
          storage_path: string | null
          thumbnail_url: string | null
          tiktok_account_id: string
          tiktok_video_id: string
          title: string | null
          updated_at: string
          user_id: string
          video_url: string
          view_count: number | null
        }
        Insert: {
          comment_count?: number | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          duration?: number | null
          id?: string
          is_downloaded?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          published_at?: string | null
          scraped_at?: string
          share_count?: number | null
          storage_path?: string | null
          thumbnail_url?: string | null
          tiktok_account_id: string
          tiktok_video_id: string
          title?: string | null
          updated_at?: string
          user_id: string
          video_url: string
          view_count?: number | null
        }
        Update: {
          comment_count?: number | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          duration?: number | null
          id?: string
          is_downloaded?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          published_at?: string | null
          scraped_at?: string
          share_count?: number | null
          storage_path?: string | null
          thumbnail_url?: string | null
          tiktok_account_id?: string
          tiktok_video_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scraped_videos_tiktok_account_id_fkey"
            columns: ["tiktok_account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          account_count: number | null
          action: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          performed_by: string | null
          plan_id: string | null
          previous_account_count: number | null
          previous_plan_id: string | null
          user_id: string
        }
        Insert: {
          account_count?: number | null
          action: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          plan_id?: string | null
          previous_account_count?: number | null
          previous_plan_id?: string | null
          user_id: string
        }
        Update: {
          account_count?: number | null
          action?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          plan_id?: string | null
          previous_account_count?: number | null
          previous_plan_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json
          id: string
          is_active: boolean | null
          max_videos_per_day: number
          name: string
          price_monthly: number
        }
        Insert: {
          created_at?: string | null
          features?: Json
          id: string
          is_active?: boolean | null
          max_videos_per_day: number
          name: string
          price_monthly: number
        }
        Update: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          max_videos_per_day?: number
          name?: string
          price_monthly?: number
        }
        Relationships: []
      }
      tiktok_accounts: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          display_name: string | null
          follower_count: number | null
          following_count: number | null
          id: string
          is_active: boolean | null
          last_profile_synced_at: string | null
          last_scraped_at: string | null
          scrape_progress_current: number | null
          scrape_progress_total: number | null
          scrape_status: string | null
          updated_at: string
          user_id: string
          username: string
          video_count: number | null
          youtube_description: string | null
          youtube_tags: string | null
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_active?: boolean | null
          last_profile_synced_at?: string | null
          last_scraped_at?: string | null
          scrape_progress_current?: number | null
          scrape_progress_total?: number | null
          scrape_status?: string | null
          updated_at?: string
          user_id: string
          username: string
          video_count?: number | null
          youtube_description?: string | null
          youtube_tags?: string | null
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_active?: boolean | null
          last_profile_synced_at?: string | null
          last_scraped_at?: string | null
          scrape_progress_current?: number | null
          scrape_progress_total?: number | null
          scrape_status?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          video_count?: number | null
          youtube_description?: string | null
          youtube_tags?: string | null
        }
        Relationships: []
      }
      upload_logs: {
        Row: {
          attempt_number: number | null
          completed_at: string | null
          created_at: string | null
          download_duration_ms: number | null
          error_code: string | null
          error_message: string | null
          error_phase: string | null
          finalize_duration_ms: number | null
          id: string
          queue_item_id: string
          scraped_video_id: string | null
          started_at: string
          status: string
          token_refresh_duration_ms: number | null
          total_duration_ms: number | null
          upload_duration_ms: number | null
          user_id: string
          video_size_bytes: number | null
          youtube_channel_id: string | null
          youtube_video_id: string | null
          youtube_video_url: string | null
        }
        Insert: {
          attempt_number?: number | null
          completed_at?: string | null
          created_at?: string | null
          download_duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          error_phase?: string | null
          finalize_duration_ms?: number | null
          id?: string
          queue_item_id: string
          scraped_video_id?: string | null
          started_at?: string
          status?: string
          token_refresh_duration_ms?: number | null
          total_duration_ms?: number | null
          upload_duration_ms?: number | null
          user_id: string
          video_size_bytes?: number | null
          youtube_channel_id?: string | null
          youtube_video_id?: string | null
          youtube_video_url?: string | null
        }
        Update: {
          attempt_number?: number | null
          completed_at?: string | null
          created_at?: string | null
          download_duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          error_phase?: string | null
          finalize_duration_ms?: number | null
          id?: string
          queue_item_id?: string
          scraped_video_id?: string | null
          started_at?: string
          status?: string
          token_refresh_duration_ms?: number | null
          total_duration_ms?: number | null
          upload_duration_ms?: number | null
          user_id?: string
          video_size_bytes?: number | null
          youtube_channel_id?: string | null
          youtube_video_id?: string | null
          youtube_video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_logs_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "publish_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_logs_scraped_video_id_fkey"
            columns: ["scraped_video_id"]
            isOneToOne: false
            referencedRelation: "scraped_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_logs_youtube_channel_id_fkey"
            columns: ["youtube_channel_id"]
            isOneToOne: false
            referencedRelation: "youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_limits: {
        Row: {
          created_at: string
          id: string
          max_tiktok_accounts: number
          max_youtube_channels: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_tiktok_accounts?: number
          max_youtube_channels?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_tiktok_accounts?: number
          max_youtube_channels?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          account_count: number
          activated_at: string | null
          activated_by: string | null
          billing_interval: string | null
          created_at: string
          expires_at: string | null
          id: string
          notification_1day_sent_at: string | null
          notification_3day_sent_at: string | null
          notification_sent_at: string | null
          payment_notes: string | null
          plan_id: string
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_count?: number
          activated_at?: string | null
          activated_by?: string | null
          billing_interval?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notification_1day_sent_at?: string | null
          notification_3day_sent_at?: string | null
          notification_sent_at?: string | null
          payment_notes?: string | null
          plan_id: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_count?: number
          activated_at?: string | null
          activated_by?: string | null
          billing_interval?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notification_1day_sent_at?: string | null
          notification_3day_sent_at?: string | null
          notification_sent_at?: string | null
          payment_notes?: string | null
          plan_id?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string
          duration: number | null
          earnings: number | null
          id: string
          status: string | null
          thumbnail_url: string | null
          tiktok_url: string | null
          title: string
          updated_at: string
          user_id: string
          views: number | null
          youtube_url: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          earnings?: number | null
          id?: string
          status?: string | null
          thumbnail_url?: string | null
          tiktok_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          views?: number | null
          youtube_url: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          earnings?: number | null
          id?: string
          status?: string | null
          thumbnail_url?: string | null
          tiktok_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views?: number | null
          youtube_url?: string
        }
        Relationships: []
      }
      youtube_channels: {
        Row: {
          access_token: string | null
          auth_status: string | null
          channel_handle: string | null
          channel_id: string | null
          channel_thumbnail: string | null
          channel_title: string | null
          created_at: string
          google_client_id: string | null
          google_client_secret: string | null
          google_redirect_uri: string | null
          id: string
          is_connected: boolean | null
          last_upload_at: string | null
          refresh_token: string | null
          subscriber_count: number | null
          tiktok_account_id: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          video_count: number | null
        }
        Insert: {
          access_token?: string | null
          auth_status?: string | null
          channel_handle?: string | null
          channel_id?: string | null
          channel_thumbnail?: string | null
          channel_title?: string | null
          created_at?: string
          google_client_id?: string | null
          google_client_secret?: string | null
          google_redirect_uri?: string | null
          id?: string
          is_connected?: boolean | null
          last_upload_at?: string | null
          refresh_token?: string | null
          subscriber_count?: number | null
          tiktok_account_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          video_count?: number | null
        }
        Update: {
          access_token?: string | null
          auth_status?: string | null
          channel_handle?: string | null
          channel_id?: string | null
          channel_thumbnail?: string | null
          channel_title?: string | null
          created_at?: string
          google_client_id?: string | null
          google_client_secret?: string | null
          google_redirect_uri?: string | null
          id?: string
          is_connected?: boolean | null
          last_upload_at?: string | null
          refresh_token?: string | null
          subscriber_count?: number | null
          tiktok_account_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          video_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_channels_tiktok_account_id_fkey"
            columns: ["tiktok_account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_quota_usage: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_paused: boolean
          quota_limit: number
          quota_used: number
          updated_at: string | null
          uploads_count: number
          youtube_channel_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_paused?: boolean
          quota_limit?: number
          quota_used?: number
          updated_at?: string | null
          uploads_count?: number
          youtube_channel_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_paused?: boolean
          quota_limit?: number
          quota_used?: number
          updated_at?: string | null
          uploads_count?: number
          youtube_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_quota_usage_youtube_channel_id_fkey"
            columns: ["youtube_channel_id"]
            isOneToOne: false
            referencedRelation: "youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_quota_available: {
        Args: { p_channel_id: string; p_quota_cost?: number }
        Returns: boolean
      }
      fix_ownership_mismatches: { Args: never; Returns: number }
      get_cron_history: {
        Args: { limit_rows?: number }
        Returns: {
          end_time: string
          job_name: string
          jobid: number
          return_message: string
          runid: number
          start_time: string
          status: string
        }[]
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      get_incorrectly_published_videos: {
        Args: never
        Returns: {
          account_owner_id: string
          incorrectly_published_count: number
          tiktok_account_id: string
          username: string
        }[]
      }
      get_ownership_mismatches: {
        Args: never
        Returns: {
          account_owner_id: string
          mismatched_video_count: number
          tiktok_account_id: string
          username: string
        }[]
      }
      get_user_auth_metadata: {
        Args: never
        Returns: {
          auth_created_at: string
          email_confirmed_at: string
          last_sign_in_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_quota_usage: {
        Args: { p_channel_id: string; p_date: string; p_quota_cost: number }
        Returns: undefined
      }
      is_apify_configured: { Args: never; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      restore_incorrectly_published_videos: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user" | "owner"
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
      app_role: ["admin", "user", "owner"],
    },
  },
} as const
