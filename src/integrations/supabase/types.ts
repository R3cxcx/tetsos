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
      attendance_business_rules: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          name: string
          parameters: Json
          rule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          name: string
          parameters?: Json
          rule_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parameters?: Json
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          in_terminal_id: string | null
          is_confirmed: boolean
          notes: string | null
          out_terminal_id: string | null
          source_type: string
          status: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          id?: string
          in_terminal_id?: string | null
          is_confirmed?: boolean
          notes?: string | null
          out_terminal_id?: string | null
          source_type?: string
          status?: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          in_terminal_id?: string | null
          is_confirmed?: boolean
          notes?: string | null
          out_terminal_id?: string | null
          source_type?: string
          status?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_attendance_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_categories: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_statuses: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          arabic_name: string | null
          birth_date: string | null
          birth_place: string | null
          category: string | null
          created_at: string
          created_by: string | null
          date_of_joining: string | null
          date_of_leaving: string | null
          deleted_at: string | null
          employee_id: string
          english_name: string
          gender: string | null
          home_phone: string | null
          id: string
          id_number: string | null
          is_deletable: boolean
          issue_date: string | null
          issuing_body: string | null
          marital_status: string | null
          nationality: string | null
          nok_name: string | null
          nok_person: string | null
          nok_phone_number: string | null
          personal_email: string | null
          position: string | null
          qualifications: string | null
          status: string
          updated_at: string
          user_id: string | null
          work_phone: string | null
        }
        Insert: {
          arabic_name?: string | null
          birth_date?: string | null
          birth_place?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          date_of_joining?: string | null
          date_of_leaving?: string | null
          deleted_at?: string | null
          employee_id: string
          english_name: string
          gender?: string | null
          home_phone?: string | null
          id?: string
          id_number?: string | null
          is_deletable?: boolean
          issue_date?: string | null
          issuing_body?: string | null
          marital_status?: string | null
          nationality?: string | null
          nok_name?: string | null
          nok_person?: string | null
          nok_phone_number?: string | null
          personal_email?: string | null
          position?: string | null
          qualifications?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          work_phone?: string | null
        }
        Update: {
          arabic_name?: string | null
          birth_date?: string | null
          birth_place?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          date_of_joining?: string | null
          date_of_leaving?: string | null
          deleted_at?: string | null
          employee_id?: string
          english_name?: string
          gender?: string | null
          home_phone?: string | null
          id?: string
          id_number?: string | null
          is_deletable?: boolean
          issue_date?: string | null
          issuing_body?: string | null
          marital_status?: string | null
          nationality?: string | null
          nok_name?: string | null
          nok_person?: string | null
          nok_phone_number?: string | null
          personal_email?: string | null
          position?: string | null
          qualifications?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          work_phone?: string | null
        }
        Relationships: []
      }
      employees_staging: {
        Row: {
          arabic_name: string | null
          birth_date: string | null
          birth_place: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          date_of_joining: string | null
          date_of_leaving: string | null
          employee_id: string | null
          english_name: string | null
          gender: string | null
          home_phone: string | null
          id: string
          id_number: string | null
          issue_date: string | null
          issuing_body: string | null
          marital_status: string | null
          nationality: string | null
          nok_name: string | null
          nok_person: string | null
          nok_phone_number: string | null
          personal_email: string | null
          position: string | null
          qualifications: string | null
          status: string | null
          updated_at: string | null
          work_phone: string | null
        }
        Insert: {
          arabic_name?: string | null
          birth_date?: string | null
          birth_place?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_joining?: string | null
          date_of_leaving?: string | null
          employee_id?: string | null
          english_name?: string | null
          gender?: string | null
          home_phone?: string | null
          id?: string
          id_number?: string | null
          issue_date?: string | null
          issuing_body?: string | null
          marital_status?: string | null
          nationality?: string | null
          nok_name?: string | null
          nok_person?: string | null
          nok_phone_number?: string | null
          personal_email?: string | null
          position?: string | null
          qualifications?: string | null
          status?: string | null
          updated_at?: string | null
          work_phone?: string | null
        }
        Update: {
          arabic_name?: string | null
          birth_date?: string | null
          birth_place?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_joining?: string | null
          date_of_leaving?: string | null
          employee_id?: string | null
          english_name?: string | null
          gender?: string | null
          home_phone?: string | null
          id?: string
          id_number?: string | null
          issue_date?: string | null
          issuing_body?: string | null
          marital_status?: string | null
          nationality?: string | null
          nok_name?: string | null
          nok_person?: string | null
          nok_phone_number?: string | null
          personal_email?: string | null
          position?: string | null
          qualifications?: string | null
          status?: string | null
          updated_at?: string | null
          work_phone?: string | null
        }
        Relationships: []
      }
      hiring_requests: {
        Row: {
          candidate_id: string
          contract_details: string | null
          created_at: string | null
          created_by: string
          final_contract_details: string | null
          final_salary: number | null
          hired_at: string | null
          hired_employee_id: string | null
          hr_approved_at: string | null
          hr_comments: string | null
          hr_manager_id: string | null
          id: string
          justification: string | null
          payroll_approved_at: string | null
          payroll_comments: string | null
          payroll_officer_id: string | null
          pd_approved_at: string | null
          pd_comments: string | null
          projects_director_id: string | null
          proposed_salary: number | null
          proposed_start_date: string | null
          recruitment_manager_id: string | null
          recruitment_request_id: string
          rm_approved_at: string | null
          rm_comments: string | null
          status: Database["public"]["Enums"]["hiring_request_status"] | null
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          contract_details?: string | null
          created_at?: string | null
          created_by: string
          final_contract_details?: string | null
          final_salary?: number | null
          hired_at?: string | null
          hired_employee_id?: string | null
          hr_approved_at?: string | null
          hr_comments?: string | null
          hr_manager_id?: string | null
          id?: string
          justification?: string | null
          payroll_approved_at?: string | null
          payroll_comments?: string | null
          payroll_officer_id?: string | null
          pd_approved_at?: string | null
          pd_comments?: string | null
          projects_director_id?: string | null
          proposed_salary?: number | null
          proposed_start_date?: string | null
          recruitment_manager_id?: string | null
          recruitment_request_id: string
          rm_approved_at?: string | null
          rm_comments?: string | null
          status?: Database["public"]["Enums"]["hiring_request_status"] | null
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          contract_details?: string | null
          created_at?: string | null
          created_by?: string
          final_contract_details?: string | null
          final_salary?: number | null
          hired_at?: string | null
          hired_employee_id?: string | null
          hr_approved_at?: string | null
          hr_comments?: string | null
          hr_manager_id?: string | null
          id?: string
          justification?: string | null
          payroll_approved_at?: string | null
          payroll_comments?: string | null
          payroll_officer_id?: string | null
          pd_approved_at?: string | null
          pd_comments?: string | null
          projects_director_id?: string | null
          proposed_salary?: number | null
          proposed_start_date?: string | null
          recruitment_manager_id?: string | null
          recruitment_request_id?: string
          rm_approved_at?: string | null
          rm_comments?: string | null
          status?: Database["public"]["Enums"]["hiring_request_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hiring_requests_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_requests_recruitment_request_id_fkey"
            columns: ["recruitment_request_id"]
            isOneToOne: false
            referencedRelation: "recruitment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      id_sequences: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          key: string
          next_number: number
          padding: number
          prefix: string
          separator: string
          suffix: string
          target_column: string | null
          target_table: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          next_number?: number
          padding?: number
          prefix?: string
          separator?: string
          suffix?: string
          target_column?: string | null
          target_table?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          next_number?: number
          padding?: number
          prefix?: string
          separator?: string
          suffix?: string
          target_column?: string | null
          target_table?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      interview_assessments: {
        Row: {
          additional_comments: string | null
          candidate_email: string | null
          candidate_id: string | null
          candidate_name: string
          candidate_phone: string | null
          communication_notes: string | null
          communication_score: number | null
          created_at: string
          cultural_fit_notes: string | null
          cultural_fit_score: number | null
          decision: Database["public"]["Enums"]["interview_decision"] | null
          experience_notes: string | null
          experience_score: number | null
          id: string
          interview_date: string | null
          interviewer_id: string
          overall_score: number | null
          recommendation: string | null
          recruitment_request_id: string
          technical_notes: string | null
          technical_skills_score: number | null
          updated_at: string
        }
        Insert: {
          additional_comments?: string | null
          candidate_email?: string | null
          candidate_id?: string | null
          candidate_name: string
          candidate_phone?: string | null
          communication_notes?: string | null
          communication_score?: number | null
          created_at?: string
          cultural_fit_notes?: string | null
          cultural_fit_score?: number | null
          decision?: Database["public"]["Enums"]["interview_decision"] | null
          experience_notes?: string | null
          experience_score?: number | null
          id?: string
          interview_date?: string | null
          interviewer_id: string
          overall_score?: number | null
          recommendation?: string | null
          recruitment_request_id: string
          technical_notes?: string | null
          technical_skills_score?: number | null
          updated_at?: string
        }
        Update: {
          additional_comments?: string | null
          candidate_email?: string | null
          candidate_id?: string | null
          candidate_name?: string
          candidate_phone?: string | null
          communication_notes?: string | null
          communication_score?: number | null
          created_at?: string
          cultural_fit_notes?: string | null
          cultural_fit_score?: number | null
          decision?: Database["public"]["Enums"]["interview_decision"] | null
          experience_notes?: string | null
          experience_score?: number | null
          id?: string
          interview_date?: string | null
          interviewer_id?: string
          overall_score?: number | null
          recommendation?: string | null
          recruitment_request_id?: string
          technical_notes?: string | null
          technical_skills_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_assessments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_assessments_recruitment_request_id_fkey"
            columns: ["recruitment_request_id"]
            isOneToOne: false
            referencedRelation: "recruitment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      nationalities: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      raw_attendance_data: {
        Row: {
          clocking_time: string
          created_at: string
          employee_id: string
          employee_uuid: string | null
          id: string
          match_status: Database["public"]["Enums"]["match_status"] | null
          name: string
          processed: boolean
          terminal_description: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clocking_time: string
          created_at?: string
          employee_id: string
          employee_uuid?: string | null
          id?: string
          match_status?: Database["public"]["Enums"]["match_status"] | null
          name: string
          processed?: boolean
          terminal_description?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clocking_time?: string
          created_at?: string
          employee_id?: string
          employee_uuid?: string | null
          id?: string
          match_status?: Database["public"]["Enums"]["match_status"] | null
          name?: string
          processed?: boolean
          terminal_description?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_attendance_data_employee_uuid_fkey"
            columns: ["employee_uuid"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_activities: {
        Row: {
          activity_details: string | null
          activity_type: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["recruitment_status"] | null
          performed_by: string
          previous_status:
            | Database["public"]["Enums"]["recruitment_status"]
            | null
          recruitment_request_id: string
        }
        Insert: {
          activity_details?: string | null
          activity_type: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["recruitment_status"] | null
          performed_by: string
          previous_status?:
            | Database["public"]["Enums"]["recruitment_status"]
            | null
          recruitment_request_id: string
        }
        Update: {
          activity_details?: string | null
          activity_type?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["recruitment_status"] | null
          performed_by?: string
          previous_status?:
            | Database["public"]["Enums"]["recruitment_status"]
            | null
          recruitment_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_activities_recruitment_request_id_fkey"
            columns: ["recruitment_request_id"]
            isOneToOne: false
            referencedRelation: "recruitment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_candidates: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          request_id: string
          status: Database["public"]["Enums"]["recruitment_candidate_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["recruitment_candidate_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["recruitment_candidate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_candidates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "recruitment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_requests: {
        Row: {
          contract_details: string | null
          cost_center: string
          created_at: string
          department: string
          employee_id: string | null
          expected_start_date: string | null
          final_salary: number | null
          headcount_increase: boolean | null
          hired_at: string | null
          hired_employee_id: string | null
          hiring_manager_approved_at: string | null
          hiring_manager_comments: string | null
          hiring_manager_id: string | null
          hm_approved_at: string | null
          hm_id: string | null
          hr_manager_id: string | null
          hrm_approved_at: string | null
          id: string
          job_description: string | null
          justification: string | null
          payroll_approved_at: string | null
          payroll_officer_id: string | null
          pd_approved_at: string | null
          position_title: string
          preferred_qualifications: string | null
          projects_director_id: string | null
          recruiter_assigned_at: string | null
          recruiter_id: string | null
          recruitment_manager_approved_at: string | null
          recruitment_manager_id: string | null
          replacement_for: string | null
          requested_by: string
          required_qualifications: string | null
          salary: number | null
          salary_range_max: number | null
          salary_range_min: number | null
          site_hr_id: string | null
          status: Database["public"]["Enums"]["recruitment_status"]
          submitted_at: string | null
          updated_at: string
          vacancies: number | null
        }
        Insert: {
          contract_details?: string | null
          cost_center: string
          created_at?: string
          department: string
          employee_id?: string | null
          expected_start_date?: string | null
          final_salary?: number | null
          headcount_increase?: boolean | null
          hired_at?: string | null
          hired_employee_id?: string | null
          hiring_manager_approved_at?: string | null
          hiring_manager_comments?: string | null
          hiring_manager_id?: string | null
          hm_approved_at?: string | null
          hm_id?: string | null
          hr_manager_id?: string | null
          hrm_approved_at?: string | null
          id?: string
          job_description?: string | null
          justification?: string | null
          payroll_approved_at?: string | null
          payroll_officer_id?: string | null
          pd_approved_at?: string | null
          position_title: string
          preferred_qualifications?: string | null
          projects_director_id?: string | null
          recruiter_assigned_at?: string | null
          recruiter_id?: string | null
          recruitment_manager_approved_at?: string | null
          recruitment_manager_id?: string | null
          replacement_for?: string | null
          requested_by: string
          required_qualifications?: string | null
          salary?: number | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          site_hr_id?: string | null
          status?: Database["public"]["Enums"]["recruitment_status"]
          submitted_at?: string | null
          updated_at?: string
          vacancies?: number | null
        }
        Update: {
          contract_details?: string | null
          cost_center?: string
          created_at?: string
          department?: string
          employee_id?: string | null
          expected_start_date?: string | null
          final_salary?: number | null
          headcount_increase?: boolean | null
          hired_at?: string | null
          hired_employee_id?: string | null
          hiring_manager_approved_at?: string | null
          hiring_manager_comments?: string | null
          hiring_manager_id?: string | null
          hm_approved_at?: string | null
          hm_id?: string | null
          hr_manager_id?: string | null
          hrm_approved_at?: string | null
          id?: string
          job_description?: string | null
          justification?: string | null
          payroll_approved_at?: string | null
          payroll_officer_id?: string | null
          pd_approved_at?: string | null
          position_title?: string
          preferred_qualifications?: string | null
          projects_director_id?: string | null
          recruiter_assigned_at?: string | null
          recruiter_id?: string | null
          recruitment_manager_approved_at?: string | null
          recruitment_manager_id?: string | null
          replacement_for?: string | null
          requested_by?: string
          required_qualifications?: string | null
          salary?: number | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          site_hr_id?: string | null
          status?: Database["public"]["Enums"]["recruitment_status"]
          submitted_at?: string | null
          updated_at?: string
          vacancies?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_requests_employee_fk"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_requests_hired_employee_id_fkey"
            columns: ["hired_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      terminals: {
        Row: {
          connection_method: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          location: string | null
          site_admin_name: string | null
          terminal_name: string
          terminal_uid: string
          updated_at: string
        }
        Insert: {
          connection_method?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          site_admin_name?: string | null
          terminal_name: string
          terminal_uid: string
          updated_at?: string
        }
        Update: {
          connection_method?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          site_admin_name?: string | null
          terminal_name?: string
          terminal_uid?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_id_mapping: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_id_mapping_employee_fk"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
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
      auto_approve_normal_attendance: {
        Args: { p_date?: string }
        Returns: Json
      }
      calculate_daily_attendance_stats: {
        Args: { p_date?: string }
        Returns: Json
      }
      detect_attendance_anomalies: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: {
          anomaly_details: Json
          anomaly_type: string
          date: string
          employee_id: string
          employee_name: string
          severity: string
        }[]
      }
      enhanced_process_raw_attendance: {
        Args: {
          p_auto_approve?: boolean
          p_date_from?: string
          p_date_to?: string
          p_mark_processed?: boolean
        }
        Returns: Json
      }
      escape_regex_text: {
        Args: { p_text: string }
        Returns: string
      }
      get_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: {
          actor_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string | null
          target_user_id: string | null
          user_agent: string | null
        }[]
      }
      get_employee_safe_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          arabic_name: string
          category: string
          created_at: string
          date_of_joining: string
          date_of_leaving: string
          employee_id: string
          english_name: string
          id: string
          nationality: string
          position_title: string
          qualifications: string
          status: string
          updated_at: string
          user_id: string
          work_phone: string
        }[]
      }
      get_employee_sensitive_data: {
        Args: { p_employee_id: string }
        Returns: {
          arabic_name: string
          birth_date: string
          birth_place: string
          category: string
          created_at: string
          date_of_joining: string
          date_of_leaving: string
          employee_id: string
          english_name: string
          gender: string
          home_phone: string
          id: string
          id_number: string
          is_deletable: boolean
          issue_date: string
          issuing_body: string
          marital_status: string
          nationality: string
          nok_name: string
          nok_person: string
          nok_phone_number: string
          personal_email: string
          position: string
          qualifications: string
          status: string
          updated_at: string
          user_id: string
          work_phone: string
        }[]
      }
      get_employee_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_count: number
          inactive_count: number
          pending_count: number
          total_count: number
        }[]
      }
      get_employees_basic_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          arabic_name: string
          category: string
          created_at: string
          date_of_joining: string
          date_of_leaving: string
          employee_id: string
          english_name: string
          id: string
          is_deletable: boolean
          nationality: string
          position_title: string
          qualifications: string
          status: string
          updated_at: string
          user_id: string
          work_phone: string
        }[]
      }
      get_employees_paginated: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_direction?: string
          p_sort_field?: string
          p_status_filter?: string
        }
        Returns: {
          arabic_name: string
          category: string
          created_at: string
          date_of_joining: string
          date_of_leaving: string
          employee_id: string
          english_name: string
          id: string
          is_deletable: boolean
          nationality: string
          position_title: string
          qualifications: string
          status: string
          total_count: number
          updated_at: string
          user_id: string
          work_phone: string
        }[]
      }
      get_employees_sensitive_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          arabic_name: string
          birth_date: string
          birth_place: string
          category: string
          created_at: string
          date_of_joining: string
          date_of_leaving: string
          employee_id: string
          english_name: string
          gender: string
          home_phone: string
          id: string
          id_number: string
          issue_date: string
          issuing_body: string
          marital_status: string
          nationality: string
          nok_name: string
          nok_person: string
          nok_phone_number: string
          personal_email: string
          position_title: string
          qualifications: string
          status: string
          updated_at: string
          user_id: string
          work_phone: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_actor_id?: string
          p_event_type: Database["public"]["Enums"]["audit_event_type"]
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
          p_resource_id?: string
          p_resource_type?: string
          p_target_user_id?: string
        }
        Returns: string
      }
      next_formatted_id: {
        Args: { p_key: string }
        Returns: string
      }
      normalize_employee_code: {
        Args: { p_raw: string }
        Returns: string
      }
      process_raw_attendance: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_mark_processed?: boolean
        }
        Returns: Json
      }
      promote_staging_employee: {
        Args: { p_staging_employee_id: string }
        Returns: string
      }
      safe_delete_employee: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      update_employee_secure: {
        Args: { p_employee_id: string; p_updates: Json }
        Returns: Json
      }
      upsert_direct_attendance: {
        Args: {
          p_clock_in: string
          p_clock_out?: string
          p_employee_code: string
          p_in_terminal_id?: string
          p_out_terminal_id?: string
        }
        Returns: Json
      }
      upsert_employee_data: {
        Args: {
          p_arabic_name?: string
          p_birth_date?: string
          p_birth_place?: string
          p_category?: string
          p_date_of_joining?: string
          p_date_of_leaving?: string
          p_employee_id: string
          p_english_name?: string
          p_gender?: string
          p_home_phone?: string
          p_id_number?: string
          p_issue_date?: string
          p_issuing_body?: string
          p_marital_status?: string
          p_nationality?: string
          p_nok_name?: string
          p_nok_person?: string
          p_nok_phone_number?: string
          p_personal_email?: string
          p_position?: string
          p_qualifications?: string
          p_status?: string
          p_work_phone?: string
        }
        Returns: Json
      }
      validate_sequence_ids: {
        Args: { p_key: string }
        Returns: Json
      }
    }
    Enums: {
      app_permission:
        | "employees.create"
        | "employees.read"
        | "employees.update"
        | "employees.delete"
        | "roles.create"
        | "roles.read"
        | "roles.update"
        | "roles.delete"
        | "users.create"
        | "users.read"
        | "users.update"
        | "users.delete"
        | "settings.read"
        | "settings.update"
        | "attendance.read"
        | "attendance.create"
        | "attendance.update"
        | "attendance.delete"
        | "recruitment.read"
        | "recruitment.create"
        | "recruitment.update"
        | "recruitment.delete"
        | "cost_centers.read"
        | "cost_centers.create"
        | "cost_centers.update"
        | "cost_centers.delete"
        | "budget.read"
        | "budget.create"
        | "budget.update"
        | "budget.delete"
      app_role:
        | "super_admin"
        | "admin"
        | "hr_manager"
        | "hr_staff"
        | "employee"
        | "recruiter"
      audit_event_type:
        | "user_created"
        | "user_updated"
        | "user_deleted"
        | "role_assigned"
        | "role_removed"
        | "permission_granted"
        | "permission_revoked"
        | "login_success"
        | "login_failed"
        | "logout"
        | "password_changed"
        | "employee_created"
        | "employee_updated"
        | "employee_deleted"
        | "recruitment_request_created"
        | "recruitment_request_updated"
        | "recruitment_request_approved"
        | "recruitment_request_rejected"
        | "sensitive_data_accessed"
        | "data_export"
        | "system_configuration_changed"
      hiring_request_status:
        | "pending_rm_approval"
        | "approved_by_rm"
        | "rejected_by_rm"
        | "pending_hr_approval"
        | "approved_by_hr"
        | "rejected_by_hr"
        | "pending_pd_approval"
        | "approved_by_pd"
        | "rejected_by_pd"
        | "pending_payroll"
        | "approved_by_payroll"
        | "rejected_by_payroll"
        | "contract_generated"
        | "hired"
        | "rejected"
      interview_decision: "accepted" | "rejected"
      match_status: "matched" | "unmatched" | "rejected"
      recruitment_candidate_status:
        | "created"
        | "interview_pending"
        | "interview_completed"
        | "accepted"
        | "rejected"
      recruitment_status:
        | "draft"
        | "pending_hiring_manager"
        | "approved_by_hiring_manager"
        | "rejected_by_hiring_manager"
        | "pending_recruiter"
        | "in_recruitment_process"
        | "pending_recruitment_manager"
        | "contract_generated"
        | "hired"
        | "rejected"
        | "approved_by_hm"
        | "candidates_created"
        | "pending_interview_assessment"
        | "recruiter_assigned"
        | "hiring_request"
        | "pending_hr_manager"
        | "pending_projects_director"
        | "pending_payroll"
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
      app_permission: [
        "employees.create",
        "employees.read",
        "employees.update",
        "employees.delete",
        "roles.create",
        "roles.read",
        "roles.update",
        "roles.delete",
        "users.create",
        "users.read",
        "users.update",
        "users.delete",
        "settings.read",
        "settings.update",
        "attendance.read",
        "attendance.create",
        "attendance.update",
        "attendance.delete",
        "recruitment.read",
        "recruitment.create",
        "recruitment.update",
        "recruitment.delete",
        "cost_centers.read",
        "cost_centers.create",
        "cost_centers.update",
        "cost_centers.delete",
        "budget.read",
        "budget.create",
        "budget.update",
        "budget.delete",
      ],
      app_role: [
        "super_admin",
        "admin",
        "hr_manager",
        "hr_staff",
        "employee",
        "recruiter",
      ],
      audit_event_type: [
        "user_created",
        "user_updated",
        "user_deleted",
        "role_assigned",
        "role_removed",
        "permission_granted",
        "permission_revoked",
        "login_success",
        "login_failed",
        "logout",
        "password_changed",
        "employee_created",
        "employee_updated",
        "employee_deleted",
        "recruitment_request_created",
        "recruitment_request_updated",
        "recruitment_request_approved",
        "recruitment_request_rejected",
        "sensitive_data_accessed",
        "data_export",
        "system_configuration_changed",
      ],
      hiring_request_status: [
        "pending_rm_approval",
        "approved_by_rm",
        "rejected_by_rm",
        "pending_hr_approval",
        "approved_by_hr",
        "rejected_by_hr",
        "pending_pd_approval",
        "approved_by_pd",
        "rejected_by_pd",
        "pending_payroll",
        "approved_by_payroll",
        "rejected_by_payroll",
        "contract_generated",
        "hired",
        "rejected",
      ],
      interview_decision: ["accepted", "rejected"],
      match_status: ["matched", "unmatched", "rejected"],
      recruitment_candidate_status: [
        "created",
        "interview_pending",
        "interview_completed",
        "accepted",
        "rejected",
      ],
      recruitment_status: [
        "draft",
        "pending_hiring_manager",
        "approved_by_hiring_manager",
        "rejected_by_hiring_manager",
        "pending_recruiter",
        "in_recruitment_process",
        "pending_recruitment_manager",
        "contract_generated",
        "hired",
        "rejected",
        "approved_by_hm",
        "candidates_created",
        "pending_interview_assessment",
        "recruiter_assigned",
        "hiring_request",
        "pending_hr_manager",
        "pending_projects_director",
        "pending_payroll",
      ],
    },
  },
} as const
