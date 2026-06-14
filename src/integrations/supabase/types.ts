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
      assessments: {
        Row: {
          agility: number | null
          assessment_date: string
          assessor_id: string
          athlete_id: string
          balance_stability: number | null
          coachability: number | null
          comments: string | null
          consistency: number | null
          created_at: string
          endurance: number | null
          flexibility: number | null
          id: string
          overall_score: number
          punctuality: number | null
          quarter: string | null
          race_skills: number | null
          respect: number | null
          speed_control: number | null
          stamina: number | null
          strength: number | null
          team_spirit: number | null
          turning_technique: number | null
        }
        Insert: {
          agility?: number | null
          assessment_date?: string
          assessor_id: string
          athlete_id: string
          balance_stability?: number | null
          coachability?: number | null
          comments?: string | null
          consistency?: number | null
          created_at?: string
          endurance?: number | null
          flexibility?: number | null
          id?: string
          overall_score: number
          punctuality?: number | null
          quarter?: string | null
          race_skills?: number | null
          respect?: number | null
          speed_control?: number | null
          stamina?: number | null
          strength?: number | null
          team_spirit?: number | null
          turning_technique?: number | null
        }
        Update: {
          agility?: number | null
          assessment_date?: string
          assessor_id?: string
          athlete_id?: string
          balance_stability?: number | null
          coachability?: number | null
          comments?: string | null
          consistency?: number | null
          created_at?: string
          endurance?: number | null
          flexibility?: number | null
          id?: string
          overall_score?: number
          punctuality?: number | null
          quarter?: string | null
          race_skills?: number | null
          respect?: number | null
          speed_control?: number | null
          stamina?: number | null
          strength?: number | null
          team_spirit?: number | null
          turning_technique?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_transfers: {
        Row: {
          athlete_id: string
          created_at: string
          from_branch_id: string | null
          id: string
          performed_by: string | null
          reason: string | null
          to_branch_id: string
          transfer_date: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          from_branch_id?: string | null
          id?: string
          performed_by?: string | null
          reason?: string | null
          to_branch_id: string
          transfer_date?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          from_branch_id?: string | null
          id?: string
          performed_by?: string | null
          reason?: string | null
          to_branch_id?: string
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_transfers_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          active: boolean
          address: string | null
          athlete_number: string
          branch_id: string
          class_level: string | null
          created_at: string
          created_by: string | null
          current_level: Database["public"]["Enums"]["level_t"]
          date_of_birth: string | null
          discipline: Database["public"]["Enums"]["discipline_t"]
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_t"] | null
          id: string
          id_passport: string | null
          medical_info: string | null
          nationality: string | null
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          photo_url: string | null
          preferred_foot: string | null
          registered_year: number
          school: string | null
          town: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          athlete_number: string
          branch_id: string
          class_level?: string | null
          created_at?: string
          created_by?: string | null
          current_level?: Database["public"]["Enums"]["level_t"]
          date_of_birth?: string | null
          discipline?: Database["public"]["Enums"]["discipline_t"]
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_t"] | null
          id?: string
          id_passport?: string | null
          medical_info?: string | null
          nationality?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          photo_url?: string | null
          preferred_foot?: string | null
          registered_year?: number
          school?: string | null
          town?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          active?: boolean
          address?: string | null
          athlete_number?: string
          branch_id?: string
          class_level?: string | null
          created_at?: string
          created_by?: string | null
          current_level?: Database["public"]["Enums"]["level_t"]
          date_of_birth?: string | null
          discipline?: Database["public"]["Enums"]["discipline_t"]
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_t"] | null
          id?: string
          id_passport?: string | null
          medical_info?: string | null
          nationality?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          photo_url?: string | null
          preferred_foot?: string | null
          registered_year?: number
          school?: string | null
          town?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          athlete_id: string
          id: string
          marked_at: string
          marked_by: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          athlete_id: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          athlete_id?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      badge_awards: {
        Row: {
          assessment_id: string | null
          athlete_id: string
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
        }
        Insert: {
          assessment_id?: string | null
          athlete_id: string
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
        }
        Update: {
          assessment_id?: string | null
          athlete_id?: string
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_awards_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_awards_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      branch_coaches: {
        Row: {
          branch_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_coaches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      competition_results: {
        Row: {
          athlete_id: string
          competition_id: string
          created_at: string
          id: string
          medal: string | null
          notes: string | null
          position: number | null
          score: number | null
          timing: string | null
        }
        Insert: {
          athlete_id: string
          competition_id: string
          created_at?: string
          id?: string
          medal?: string | null
          notes?: string | null
          position?: number | null
          score?: number | null
          timing?: string | null
        }
        Update: {
          athlete_id?: string
          competition_id?: string
          created_at?: string
          id?: string
          medal?: string | null
          notes?: string | null
          position?: number | null
          score?: number | null
          timing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_results_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          branch_id: string | null
          competition_date: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          name: string
        }
        Insert: {
          branch_id?: string | null
          competition_date: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          branch_id?: string | null
          competition_date?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          athlete_id: string
          branch_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          kind: string
          period_month: string | null
          reminder_last_sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          athlete_id: string
          branch_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          kind?: string
          period_month?: string | null
          reminder_last_sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          athlete_id?: string
          branch_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          kind?: string
          period_month?: string | null
          reminder_last_sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoices_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      merchandise: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          price: number
          quantity: number
          quantity_sold: number
          sku: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          price: number
          quantity?: number
          quantity_sold?: number
          sku?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          price?: number
          quantity?: number
          quantity_sold?: number
          sku?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      merchandise_sales: {
        Row: {
          athlete_id: string | null
          id: string
          merchandise_id: string
          payment_id: string | null
          quantity: number
          sold_at: string
          sold_by: string | null
          total: number
          unit_price: number
        }
        Insert: {
          athlete_id?: string | null
          id?: string
          merchandise_id: string
          payment_id?: string | null
          quantity: number
          sold_at?: string
          sold_by?: string | null
          total: number
          unit_price: number
        }
        Update: {
          athlete_id?: string | null
          id?: string
          merchandise_id?: string
          payment_id?: string | null
          quantity?: number
          sold_at?: string
          sold_by?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "merchandise_sales_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchandise_sales_merchandise_id_fkey"
            columns: ["merchandise_id"]
            isOneToOne: false
            referencedRelation: "merchandise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchandise_sales_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          athlete_id: string
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method_t"]
          payment_type: Database["public"]["Enums"]["payment_type_t"]
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          athlete_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method: Database["public"]["Enums"]["payment_method_t"]
          payment_type: Database["public"]["Enums"]["payment_type_t"]
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          athlete_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method_t"]
          payment_type?: Database["public"]["Enums"]["payment_type_t"]
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          new_level: Database["public"]["Enums"]["level_t"]
          previous_level: Database["public"]["Enums"]["level_t"] | null
          promoted_by: string
          promotion_date: string
          reason: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          new_level: Database["public"]["Enums"]["level_t"]
          previous_level?: Database["public"]["Enums"]["level_t"] | null
          promoted_by: string
          promotion_date?: string
          reason?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          new_level?: Database["public"]["Enums"]["level_t"]
          previous_level?: Database["public"]["Enums"]["level_t"] | null
          promoted_by?: string
          promotion_date?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          athlete_id: string | null
          branch_id: string
          channel: string
          created_at: string
          error: string | null
          id: string
          parent_email: string
          sent_by: string | null
          status: string
          total_outstanding: number
          trigger: string
        }
        Insert: {
          athlete_id?: string | null
          branch_id: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          parent_email: string
          sent_by?: string | null
          status?: string
          total_outstanding?: number
          trigger?: string
        }
        Update: {
          athlete_id?: string | null
          branch_id?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          parent_email?: string
          sent_by?: string | null
          status?: string
          total_outstanding?: number
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          end_time: string | null
          id: string
          notes: string | null
          session_date: string
          start_time: string | null
          title: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          session_date: string
          start_time?: string | null
          title?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          session_date?: string
          start_time?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_is_admin: { Args: never; Returns: boolean }
      current_user_is_coach_or_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coach_of: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_coach_of_athlete: {
        Args: { _athlete_id: string; _user_id: string }
        Returns: boolean
      }
      is_coach_of_session: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      next_athlete_number: { Args: { _branch_id: string }; Returns: string }
    }
    Enums: {
      app_role: "super_admin" | "coach"
      attendance_status: "present" | "absent" | "late" | "excused"
      discipline_t:
        | "speed"
        | "artistic"
        | "recreational"
        | "inline_hockey"
        | "other"
      gender_t: "male" | "female" | "other"
      level_t: "beginner" | "intermediate" | "advanced" | "elite"
      payment_method_t: "mpesa" | "cash"
      payment_type_t: "registration" | "monthly" | "competition" | "merchandise"
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
      app_role: ["super_admin", "coach"],
      attendance_status: ["present", "absent", "late", "excused"],
      discipline_t: [
        "speed",
        "artistic",
        "recreational",
        "inline_hockey",
        "other",
      ],
      gender_t: ["male", "female", "other"],
      level_t: ["beginner", "intermediate", "advanced", "elite"],
      payment_method_t: ["mpesa", "cash"],
      payment_type_t: ["registration", "monthly", "competition", "merchandise"],
    },
  },
} as const
