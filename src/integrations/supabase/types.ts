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
      ai_feedback: {
        Row: {
          category_scores: Json
          created_at: string
          document_id: string | null
          id: string
          recommendations: Json
          score: number | null
          strengths: Json
          summary: string
          user_id: string
          weaknesses: Json
        }
        Insert: {
          category_scores?: Json
          created_at?: string
          document_id?: string | null
          id?: string
          recommendations?: Json
          score?: number | null
          strengths?: Json
          summary: string
          user_id: string
          weaknesses?: Json
        }
        Update: {
          category_scores?: Json
          created_at?: string
          document_id?: string | null
          id?: string
          recommendations?: Json
          score?: number | null
          strengths?: Json
          summary?: string
          user_id?: string
          weaknesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["budget_kind"]
          line_date: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["budget_kind"]
          line_date?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["budget_kind"]
          line_date?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: []
      }
      change_requests: {
        Row: {
          cost_impact: number
          created_at: string
          decided_at: string | null
          decision_notes: string | null
          description: string
          id: string
          impact_assessment: string | null
          requested_by: string
          risk_impact: Database["public"]["Enums"]["cr_risk"]
          schedule_impact_days: number
          status: Database["public"]["Enums"]["cr_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_impact?: number
          created_at?: string
          decided_at?: string | null
          decision_notes?: string | null
          description: string
          id?: string
          impact_assessment?: string | null
          requested_by: string
          risk_impact?: Database["public"]["Enums"]["cr_risk"]
          schedule_impact_days?: number
          status?: Database["public"]["Enums"]["cr_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_impact?: number
          created_at?: string
          decided_at?: string | null
          decision_notes?: string | null
          description?: string
          id?: string
          impact_assessment?: string | null
          requested_by?: string
          risk_impact?: Database["public"]["Enums"]["cr_risk"]
          schedule_impact_days?: number
          status?: Database["public"]["Enums"]["cr_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content_excerpt: string | null
          created_at: string
          id: string
          mime_type: string | null
          quality_score: number | null
          size_bytes: number | null
          status: string
          storage_path: string
          title: string
          user_id: string
        }
        Insert: {
          content_excerpt?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          quality_score?: number | null
          size_bytes?: number | null
          status?: string
          storage_path: string
          title: string
          user_id: string
        }
        Update: {
          content_excerpt?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          quality_score?: number | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      inbox_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          sender_name: string
          sender_role: string
          subject: string
          tone: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          sender_name: string
          sender_role: string
          subject: string
          tone?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_name?: string
          sender_role?: string
          subject?: string
          tone?: string
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          agenda: string | null
          ai_summary: string | null
          created_at: string
          decisions: string | null
          held: boolean
          id: string
          kind: Database["public"]["Enums"]["meeting_kind"]
          minutes: string | null
          scheduled_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agenda?: string | null
          ai_summary?: string | null
          created_at?: string
          decisions?: string | null
          held?: boolean
          id?: string
          kind: Database["public"]["Enums"]["meeting_kind"]
          minutes?: string | null
          scheduled_at?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agenda?: string | null
          ai_summary?: string | null
          created_at?: string
          decisions?: string | null
          held?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["meeting_kind"]
          minutes?: string | null
          scheduled_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phase_gates: {
        Row: {
          created_at: string
          decided_at: string | null
          feedback: Json | null
          id: string
          opened_at: string | null
          phase: Database["public"]["Enums"]["gate_phase"]
          score: number | null
          status: Database["public"]["Enums"]["gate_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          feedback?: Json | null
          id?: string
          opened_at?: string | null
          phase: Database["public"]["Enums"]["gate_phase"]
          score?: number | null
          status?: Database["public"]["Enums"]["gate_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          feedback?: Json | null
          id?: string
          opened_at?: string | null
          phase?: Database["public"]["Enums"]["gate_phase"]
          score?: number | null
          status?: Database["public"]["Enums"]["gate_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          career_goal: string | null
          company: string
          country: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          manager: string
          onboarded: boolean
          preferred_name: string | null
          project_name: string
          role: string
          start_date: string | null
        }
        Insert: {
          career_goal?: string | null
          company?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          manager?: string
          onboarded?: boolean
          preferred_name?: string | null
          project_name?: string
          role?: string
          start_date?: string | null
        }
        Update: {
          career_goal?: string | null
          company?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          manager?: string
          onboarded?: boolean
          preferred_name?: string | null
          project_name?: string
          role?: string
          start_date?: string | null
        }
        Relationships: []
      }
      raid_items: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          kind: Database["public"]["Enums"]["raid_kind"]
          likelihood: Database["public"]["Enums"]["raid_severity"]
          mitigation: string | null
          owner: string | null
          severity: Database["public"]["Enums"]["raid_severity"]
          status: Database["public"]["Enums"]["raid_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          kind: Database["public"]["Enums"]["raid_kind"]
          likelihood?: Database["public"]["Enums"]["raid_severity"]
          mitigation?: string | null
          owner?: string | null
          severity?: Database["public"]["Enums"]["raid_severity"]
          status?: Database["public"]["Enums"]["raid_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["raid_kind"]
          likelihood?: Database["public"]["Enums"]["raid_severity"]
          mitigation?: string | null
          owner?: string | null
          severity?: Database["public"]["Enums"]["raid_severity"]
          status?: Database["public"]["Enums"]["raid_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      simulation_state: {
        Row: {
          chapter: string
          company: string
          health: string
          performance: Json
          phase: string
          progress: number
          project_name: string
          reputation: number
          story_log: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter?: string
          company?: string
          health?: string
          performance?: Json
          phase?: string
          progress?: number
          project_name?: string
          reputation?: number
          story_log?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter?: string
          company?: string
          health?: string
          performance?: Json
          phase?: string
          progress?: number
          project_name?: string
          reputation?: number
          story_log?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      status_reports: {
        Row: {
          achievements: string | null
          ai_feedback: Json | null
          ai_score: number | null
          created_at: string
          id: string
          next_week: string | null
          rag_summary: Database["public"]["Enums"]["rag_status"]
          risks_blockers: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          achievements?: string | null
          ai_feedback?: Json | null
          ai_score?: number | null
          created_at?: string
          id?: string
          next_week?: string | null
          rag_summary?: Database["public"]["Enums"]["rag_status"]
          risks_blockers?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          achievements?: string | null
          ai_feedback?: Json | null
          ai_score?: number | null
          created_at?: string
          id?: string
          next_week?: string | null
          rag_summary?: Database["public"]["Enums"]["rag_status"]
          risks_blockers?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          priority: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      workstream_rag: {
        Row: {
          area: Database["public"]["Enums"]["workstream_area"]
          id: string
          note: string | null
          rag: Database["public"]["Enums"]["rag_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          area: Database["public"]["Enums"]["workstream_area"]
          id?: string
          note?: string | null
          rag?: Database["public"]["Enums"]["rag_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: Database["public"]["Enums"]["workstream_area"]
          id?: string
          note?: string | null
          rag?: Database["public"]["Enums"]["rag_status"]
          updated_at?: string
          user_id?: string
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
      budget_kind: "planned" | "actual" | "invoice" | "forecast"
      cr_risk: "low" | "medium" | "high"
      cr_status: "draft" | "submitted" | "approved" | "rejected"
      gate_phase: "initiation" | "planning" | "execution" | "closure"
      gate_status: "locked" | "open" | "passed" | "failed"
      meeting_kind: "standup" | "steering" | "vendor" | "retro"
      rag_status: "green" | "amber" | "red"
      raid_kind: "risk" | "assumption" | "issue" | "dependency"
      raid_severity: "low" | "medium" | "high" | "critical"
      raid_status: "open" | "mitigating" | "closed"
      workstream_area:
        | "scope"
        | "schedule"
        | "budget"
        | "quality"
        | "resources"
        | "stakeholders"
        | "risks"
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
      budget_kind: ["planned", "actual", "invoice", "forecast"],
      cr_risk: ["low", "medium", "high"],
      cr_status: ["draft", "submitted", "approved", "rejected"],
      gate_phase: ["initiation", "planning", "execution", "closure"],
      gate_status: ["locked", "open", "passed", "failed"],
      meeting_kind: ["standup", "steering", "vendor", "retro"],
      rag_status: ["green", "amber", "red"],
      raid_kind: ["risk", "assumption", "issue", "dependency"],
      raid_severity: ["low", "medium", "high", "critical"],
      raid_status: ["open", "mitigating", "closed"],
      workstream_area: [
        "scope",
        "schedule",
        "budget",
        "quality",
        "resources",
        "stakeholders",
        "risks",
      ],
    },
  },
} as const
