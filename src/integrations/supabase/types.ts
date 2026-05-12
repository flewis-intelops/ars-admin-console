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
      handlers: {
        Row: {
          aor: string
          callsign: string
          classification_clearance: string
          created_at: string
          full_name: string
          id: string
          unit: string
          user_id: string
        }
        Insert: {
          aor: string
          callsign: string
          classification_clearance?: string
          created_at?: string
          full_name: string
          id?: string
          unit: string
          user_id: string
        }
        Update: {
          aor?: string
          callsign?: string
          classification_clearance?: string
          created_at?: string
          full_name?: string
          id?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      pairing_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          handler_id: string
          id: string
          source_id: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          handler_id: string
          id?: string
          source_id: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          handler_id?: string
          id?: string
          source_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pairing_codes_handler_id_fkey"
            columns: ["handler_id"]
            isOneToOne: false
            referencedRelation: "handlers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_codes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources_operational"
            referencedColumns: ["id"]
          },
        ]
      }
      source_registry: {
        Row: {
          created_at: string
          created_by: string
          dob: string | null
          id: string
          id_document_number: string | null
          id_document_type: string | null
          true_name: string
          vetting_notes: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          dob?: string | null
          id?: string
          id_document_number?: string | null
          id_document_type?: string | null
          true_name: string
          vetting_notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          dob?: string | null
          id?: string
          id_document_number?: string | null
          id_document_type?: string | null
          true_name?: string
          vetting_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_registry_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "handlers"
            referencedColumns: ["id"]
          },
        ]
      }
      sources_operational: {
        Row: {
          aor: string
          created_at: string
          handler_id: string
          id: string
          last_contact_at: string | null
          pseudonym: string
          registry_id: string
          reliability: Database["public"]["Enums"]["reliability_grade"] | null
          source_type: Database["public"]["Enums"]["source_type"]
          status: Database["public"]["Enums"]["source_status"]
        }
        Insert: {
          aor: string
          created_at?: string
          handler_id: string
          id?: string
          last_contact_at?: string | null
          pseudonym: string
          registry_id: string
          reliability?: Database["public"]["Enums"]["reliability_grade"] | null
          source_type: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["source_status"]
        }
        Update: {
          aor?: string
          created_at?: string
          handler_id?: string
          id?: string
          last_contact_at?: string | null
          pseudonym?: string
          registry_id?: string
          reliability?: Database["public"]["Enums"]["reliability_grade"] | null
          source_type?: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["source_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sources_operational_handler_id_fkey"
            columns: ["handler_id"]
            isOneToOne: false
            referencedRelation: "handlers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_operational_registry_id_fkey"
            columns: ["registry_id"]
            isOneToOne: true
            referencedRelation: "source_registry"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_handler_id: { Args: never; Returns: string }
      register_source: {
        Args: {
          p_aor: string
          p_dob: string
          p_id_document_number: string
          p_id_document_type: string
          p_source_type: Database["public"]["Enums"]["source_type"]
          p_true_name: string
          p_vetting_notes: string
        }
        Returns: {
          code: string
          expires_at: string
          pseudonym: string
          source_id: string
        }[]
      }
    }
    Enums: {
      reliability_grade: "A" | "B" | "C" | "D" | "E" | "F"
      source_status: "pending_vetting" | "active" | "cold" | "terminated"
      source_type:
        | "walk_in"
        | "casual"
        | "ci"
        | "sub_source"
        | "cooperating_defendant"
        | "sensitive"
        | "liaison"
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
      reliability_grade: ["A", "B", "C", "D", "E", "F"],
      source_status: ["pending_vetting", "active", "cold", "terminated"],
      source_type: [
        "walk_in",
        "casual",
        "ci",
        "sub_source",
        "cooperating_defendant",
        "sensitive",
        "liaison",
      ],
    },
  },
} as const
