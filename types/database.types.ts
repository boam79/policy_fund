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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alert_profiles: {
        Row: {
          created_at: string
          id: string
          industries: string[] | null
          is_active: boolean
          keywords: string[] | null
          last_digest_at: string | null
          notify_days_before: number
          notify_new_programs: boolean
          regions: string[] | null
          sources: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industries?: string[] | null
          is_active?: boolean
          keywords?: string[] | null
          last_digest_at?: string | null
          notify_days_before?: number
          notify_new_programs?: boolean
          regions?: string[] | null
          sources?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industries?: string[] | null
          is_active?: boolean
          keywords?: string[] | null
          last_digest_at?: string | null
          notify_days_before?: number
          notify_new_programs?: boolean
          regions?: string[] | null
          sources?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_logs: {
        Row: {
          api_type: string
          created_at: string
          endpoint: string | null
          error_message: string | null
          id: string
          request_summary: Json | null
          response_summary: Json | null
          status: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          api_type: string
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          request_summary?: Json | null
          response_summary?: Json | null
          status?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          api_type?: string
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          request_summary?: Json | null
          response_summary?: Json | null
          status?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_sync_logs: {
        Row: {
          created_at: string
          ended_at: string | null
          error_message: string | null
          failed_count: number | null
          id: string
          inserted_count: number | null
          requested_count: number | null
          source: string
          started_at: string | null
          status: string
          updated_count: number | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          inserted_count?: number | null
          requested_count?: number | null
          source: string
          started_at?: string | null
          status: string
          updated_count?: number | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          inserted_count?: number | null
          requested_count?: number | null
          source?: string
          started_at?: string | null
          status?: string
          updated_count?: number | null
        }
        Relationships: []
      }
      billing_webhooks: {
        Row: {
          created_at: string
          event_id: string | null
          event_type: string | null
          id: string
          payload: Json | null
          processed: boolean
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean
          processed_at?: string | null
          provider: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean
          processed_at?: string | null
          provider?: string
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          annual_revenue_krw: number | null
          business_age_years: number | null
          business_type: string | null
          certifications: Json | null
          city: string | null
          company_name: string | null
          created_at: string
          credit_score: number | null
          desired_amount_krw: number | null
          employee_count: number | null
          id: string
          industry: string | null
          region: string | null
          startup_stage: string | null
          support_purpose: string | null
          tax_arrears: boolean | null
          tax_issue_status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          annual_revenue_krw?: number | null
          business_age_years?: number | null
          business_type?: string | null
          certifications?: Json | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          credit_score?: number | null
          desired_amount_krw?: number | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          region?: string | null
          startup_stage?: string | null
          support_purpose?: string | null
          tax_arrears?: boolean | null
          tax_issue_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          annual_revenue_krw?: number | null
          business_age_years?: number | null
          business_type?: string | null
          certifications?: Json | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          credit_score?: number | null
          desired_amount_krw?: number | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          region?: string | null
          startup_stage?: string | null
          support_purpose?: string | null
          tax_arrears?: boolean | null
          tax_issue_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          parsed_payload: Json
          raw_query: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          parsed_payload: Json
          raw_query?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          parsed_payload?: Json
          raw_query?: string | null
        }
        Relationships: []
      }
      customer_inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          inquiry_type: string
          message: string
          name: string
          related_program_id: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          inquiry_type: string
          message: string
          name: string
          related_program_id?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          inquiry_type?: string
          message?: string
          name?: string
          related_program_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_inquiries_related_program_id_fkey"
            columns: ["related_program_id"]
            isOneToOne: false
            referencedRelation: "support_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          business_profile_id: string | null
          created_at: string
          expert_pct: number | null
          grade: string | null
          id: string
          mode: string
          recommended_programs: Json | null
          risk_factors: Json | null
          self_pct: number | null
          summary: string | null
          user_id: string | null
        }
        Insert: {
          business_profile_id?: string | null
          created_at?: string
          expert_pct?: number | null
          grade?: string | null
          id?: string
          mode: string
          recommended_programs?: Json | null
          risk_factors?: Json | null
          self_pct?: number | null
          summary?: string | null
          user_id?: string | null
        }
        Update: {
          business_profile_id?: string | null
          created_at?: string
          expert_pct?: number | null
          grade?: string | null
          id?: string
          mode?: string
          recommended_programs?: Json | null
          risk_factors?: Json | null
          self_pct?: number | null
          summary?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      eligibility_checks: {
        Row: {
          business_profile_id: string | null
          created_at: string
          id: string
          llm_explanation: string | null
          matched_conditions: Json | null
          program_id: string | null
          score: number | null
          source_clauses: Json | null
          status: string
          unmatched_conditions: Json | null
          user_id: string | null
          warnings: Json | null
        }
        Insert: {
          business_profile_id?: string | null
          created_at?: string
          id?: string
          llm_explanation?: string | null
          matched_conditions?: Json | null
          program_id?: string | null
          score?: number | null
          source_clauses?: Json | null
          status: string
          unmatched_conditions?: Json | null
          user_id?: string | null
          warnings?: Json | null
        }
        Update: {
          business_profile_id?: string | null
          created_at?: string
          id?: string
          llm_explanation?: string | null
          matched_conditions?: Json | null
          program_id?: string | null
          score?: number | null
          source_clauses?: Json | null
          status?: string
          unmatched_conditions?: Json | null
          user_id?: string | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_checks_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_checks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "support_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          feedback_text: string | null
          id: string
          metadata: Json | null
          rating: number | null
          target_id: string | null
          target_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          metadata?: Json | null
          rating?: number | null
          target_id?: string | null
          target_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          metadata?: Json | null
          rating?: number | null
          target_id?: string | null
          target_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      file_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          download_url: string | null
          error_message: string | null
          expires_at: string | null
          export_type: string
          file_format: string
          id: string
          source_id: string | null
          source_type: string
          status: string
          storage_path: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          download_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type: string
          file_format: string
          id?: string
          source_id?: string | null
          source_type: string
          status?: string
          storage_path?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          download_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_format?: string
          id?: string
          source_id?: string | null
          source_type?: string
          status?: string
          storage_path?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          content_md: string | null
          created_at: string
          doc_type: string
          eval_score: number | null
          id: string
          program_id: string | null
          quality_score: number | null
          status: string
          template: string | null
          title: string | null
          updated_at: string
          user_id: string | null
          version: number
        }
        Insert: {
          content_md?: string | null
          created_at?: string
          doc_type: string
          eval_score?: number | null
          id?: string
          program_id?: string | null
          quality_score?: number | null
          status?: string
          template?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Update: {
          content_md?: string | null
          created_at?: string
          doc_type?: string
          eval_score?: number | null
          id?: string
          program_id?: string | null
          quality_score?: number | null
          status?: string
          template?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "support_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      home_recommendation_slots: {
        Row: {
          badge_text: string | null
          created_at: string
          display_summary: string | null
          display_title: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          priority: number
          program_id: string | null
          slot_type: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          display_summary?: string | null
          display_title?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          program_id?: string | null
          slot_type: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          display_summary?: string | null
          display_title?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          program_id?: string | null
          slot_type?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_recommendation_slots_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "support_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_krw: number
          created_at: string
          id: string
          metadata: Json | null
          order_id: string | null
          order_name: string | null
          paid_at: string | null
          payment_provider: string | null
          provider_payment_id: string | null
          refunded_at: string | null
          status: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_krw: number
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          order_name?: string | null
          paid_at?: string | null
          payment_provider?: string | null
          provider_payment_id?: string | null
          refunded_at?: string | null
          status: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_krw?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          order_name?: string | null
          paid_at?: string | null
          payment_provider?: string | null
          provider_payment_id?: string | null
          refunded_at?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_documents: {
        Row: {
          content_md: string
          created_at: string
          document_type: string
          effective_date: string | null
          id: string
          is_active: boolean
          title: string
          version: string
        }
        Insert: {
          content_md: string
          created_at?: string
          document_type: string
          effective_date?: string | null
          id?: string
          is_active?: boolean
          title: string
          version: string
        }
        Update: {
          content_md?: string
          created_at?: string
          document_type?: string
          effective_date?: string | null
          id?: string
          is_active?: boolean
          title?: string
          version?: string
        }
        Relationships: []
      }
      program_impressions: {
        Row: {
          conditions: Json | null
          created_at: string
          event_type: string
          id: string
          program_id: string | null
          surface: string
          user_id: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          event_type: string
          id?: string
          program_id?: string | null
          surface: string
          user_id?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          event_type?: string
          id?: string
          program_id?: string | null
          surface?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_impressions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "support_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_impressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      program_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_count: number | null
          error_message: string | null
          id: string
          inserted_count: number | null
          requested_count: number | null
          skipped_count: number | null
          source_name: string
          started_at: string | null
          status: string
          sync_type: string
          updated_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          inserted_count?: number | null
          requested_count?: number | null
          skipped_count?: number | null
          source_name: string
          started_at?: string | null
          status: string
          sync_type: string
          updated_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          error_message?: string | null
          id?: string
          inserted_count?: number | null
          requested_count?: number | null
          skipped_count?: number | null
          source_name?: string
          started_at?: string | null
          status?: string
          sync_type?: string
          updated_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_sync_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_programs: {
        Row: {
          created_at: string | null
          id: string
          program_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "support_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      search_session_results: {
        Row: {
          created_at: string
          eligibility_status: string | null
          id: string
          program_id: string | null
          rank_order: number | null
          recommendation_score: number | null
          search_session_id: string | null
        }
        Insert: {
          created_at?: string
          eligibility_status?: string | null
          id?: string
          program_id?: string | null
          rank_order?: number | null
          recommendation_score?: number | null
          search_session_id?: string | null
        }
        Update: {
          created_at?: string
          eligibility_status?: string | null
          id?: string
          program_id?: string | null
          rank_order?: number | null
          recommendation_score?: number | null
          search_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_session_results_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "support_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_session_results_search_session_id_fkey"
            columns: ["search_session_id"]
            isOneToOne: false
            referencedRelation: "search_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      search_sessions: {
        Row: {
          applied_filters: Json | null
          confirmed_conditions: Json | null
          created_at: string
          extracted_conditions: Json | null
          id: string
          natural_language_query: string | null
          result_count: number
          sort: string
          user_id: string | null
        }
        Insert: {
          applied_filters?: Json | null
          confirmed_conditions?: Json | null
          created_at?: string
          extracted_conditions?: Json | null
          id?: string
          natural_language_query?: string | null
          result_count?: number
          sort?: string
          user_id?: string | null
        }
        Update: {
          applied_filters?: Json | null
          confirmed_conditions?: Json | null
          created_at?: string
          extracted_conditions?: Json | null
          id?: string
          natural_language_query?: string | null
          result_count?: number
          sort?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          id: string
          payment_provider: string | null
          plan: string | null
          plan_code: string
          provider_subscription_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          payment_provider?: string | null
          plan?: string | null
          plan_code: string
          provider_subscription_id?: string | null
          started_at?: string | null
          status: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          payment_provider?: string | null
          plan?: string | null
          plan_code?: string
          provider_subscription_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_programs: {
        Row: {
          application_end_date: string | null
          application_start_date: string | null
          application_url: string | null
          archived_at: string | null
          category: string | null
          click_count: number
          created_at: string
          eligibility_text: string | null
          evaluation_items: Json | null
          exclusion_text: string | null
          external_id: string
          id: string
          industry: string | null
          industry_tags: string[] | null
          organization: string | null
          parsed_conditions: Json | null
          raw_content: string | null
          recommendation_score: number | null
          region: string | null
          required_docs: Json | null
          search_text: string | null
          source: string
          status: string
          summary_text: string | null
          support_amount: string | null
          support_amount_max_krw: number | null
          support_amount_min_krw: number | null
          support_type: string | null
          sync_status: string
          synced_at: string | null
          target_business_type: string | null
          title: string
          updated_at: string
          view_count: number
          visibility_status: string
        }
        Insert: {
          application_end_date?: string | null
          application_start_date?: string | null
          application_url?: string | null
          archived_at?: string | null
          category?: string | null
          click_count?: number
          created_at?: string
          eligibility_text?: string | null
          evaluation_items?: Json | null
          exclusion_text?: string | null
          external_id: string
          id?: string
          industry?: string | null
          industry_tags?: string[] | null
          organization?: string | null
          parsed_conditions?: Json | null
          raw_content?: string | null
          recommendation_score?: number | null
          region?: string | null
          required_docs?: Json | null
          search_text?: string | null
          source: string
          status?: string
          summary_text?: string | null
          support_amount?: string | null
          support_amount_max_krw?: number | null
          support_amount_min_krw?: number | null
          support_type?: string | null
          sync_status?: string
          synced_at?: string | null
          target_business_type?: string | null
          title: string
          updated_at?: string
          view_count?: number
          visibility_status?: string
        }
        Update: {
          application_end_date?: string | null
          application_start_date?: string | null
          application_url?: string | null
          archived_at?: string | null
          category?: string | null
          click_count?: number
          created_at?: string
          eligibility_text?: string | null
          evaluation_items?: Json | null
          exclusion_text?: string | null
          external_id?: string
          id?: string
          industry?: string | null
          industry_tags?: string[] | null
          organization?: string | null
          parsed_conditions?: Json | null
          raw_content?: string | null
          recommendation_score?: number | null
          region?: string | null
          required_docs?: Json | null
          search_text?: string | null
          source?: string
          status?: string
          summary_text?: string | null
          support_amount?: string | null
          support_amount_max_krw?: number | null
          support_amount_min_krw?: number | null
          support_type?: string | null
          sync_status?: string
          synced_at?: string | null
          target_business_type?: string | null
          title?: string
          updated_at?: string
          view_count?: number
          visibility_status?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          email: string
          last_path: string | null
          last_seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          email?: string
          last_path?: string | null
          last_seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          email?: string
          last_path?: string | null
          last_seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          quantity: number
          related_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          quantity?: number
          related_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          quantity?: number
          related_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          plan_code: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          plan_code?: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          plan_code?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
