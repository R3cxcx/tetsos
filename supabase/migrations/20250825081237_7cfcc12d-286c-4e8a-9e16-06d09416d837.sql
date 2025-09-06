-- First, promote all existing staging employees to production
DO $$
DECLARE
    staging_rec RECORD;
    promoted_count INTEGER := 0;
BEGIN
    -- Loop through all staging employees and promote them
    FOR staging_rec IN 
        SELECT * FROM public.employees_staging 
        WHERE employee_id IS NOT NULL AND employee_id != ''
    LOOP
        -- Check if employee already exists in production
        IF NOT EXISTS (
            SELECT 1 FROM public.employees 
            WHERE employee_id ILIKE staging_rec.employee_id
        ) THEN
            -- Promote to production using our secure function
            BEGIN
                PERFORM public.promote_staging_employee(staging_rec.id);
                promoted_count := promoted_count + 1;
            EXCEPTION WHEN OTHERS THEN
                -- Log error but continue with other records
                RAISE NOTICE 'Failed to promote employee %: %', staging_rec.employee_id, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Promoted % staging employees to production', promoted_count;
END $$;

-- Add unique constraint on employee_id to prevent duplicates
ALTER TABLE public.employees 
ADD CONSTRAINT employees_employee_id_unique UNIQUE (employee_id);

-- Clear the staging table after promotion
TRUNCATE TABLE public.employees_staging;

-- Create function to handle employee data updates
CREATE OR REPLACE FUNCTION public.upsert_employee_data(
    p_employee_id text,
    p_english_name text DEFAULT NULL,
    p_arabic_name text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_position text DEFAULT NULL,
    p_personal_email text DEFAULT NULL,
    p_qualifications text DEFAULT NULL,
    p_nationality text DEFAULT NULL,
    p_gender text DEFAULT NULL,
    p_marital_status text DEFAULT NULL,
    p_id_number text DEFAULT NULL,
    p_issuing_body text DEFAULT NULL,
    p_birth_place text DEFAULT NULL,
    p_work_phone text DEFAULT NULL,
    p_home_phone text DEFAULT NULL,
    p_nok_person text DEFAULT NULL,
    p_nok_name text DEFAULT NULL,
    p_nok_phone_number text DEFAULT NULL,
    p_category text DEFAULT NULL,
    p_date_of_joining text DEFAULT NULL,
    p_date_of_leaving text DEFAULT NULL,
    p_issue_date text DEFAULT NULL,
    p_birth_date text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_employee_uuid uuid;
    v_parsed_date_of_joining date;
    v_parsed_date_of_leaving date;
    v_parsed_issue_date date;
    v_parsed_birth_date date;
    v_mapped_status text;
    v_is_new boolean := false;
BEGIN
    -- Check if user has required permissions
    IF NOT (
        public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
        public.has_role(auth.uid(), 'admin'::public.app_role) OR
        public.has_role(auth.uid(), 'hr_manager'::public.app_role) OR
        public.has_permission(auth.uid(), 'employees.update'::public.app_permission)
    ) THEN
        RAISE EXCEPTION 'Access denied. Insufficient permissions to update employee data.';
    END IF;

    -- Validate required fields
    IF p_employee_id IS NULL OR p_employee_id = '' THEN
        RAISE EXCEPTION 'Employee ID is required';
    END IF;

    -- Parse dates with proper validation
    v_parsed_date_of_joining := CASE 
        WHEN p_date_of_joining IS NULL OR p_date_of_joining = 'null' OR p_date_of_joining = 'undefined' OR p_date_of_joining = '' THEN NULL
        WHEN p_date_of_joining ~ '^\d{4}-\d{2}-\d{2}$' THEN p_date_of_joining::date
        ELSE (
            CASE 
                WHEN p_date_of_joining::date >= '1900-01-01' AND p_date_of_joining::date <= '2100-12-31' 
                THEN p_date_of_joining::date
                ELSE NULL
            END
        )
    END;

    v_parsed_date_of_leaving := CASE 
        WHEN p_date_of_leaving IS NULL OR p_date_of_leaving = 'null' OR p_date_of_leaving = 'undefined' OR p_date_of_leaving = '' THEN NULL
        WHEN p_date_of_leaving ~ '^\d{4}-\d{2}-\d{2}$' THEN p_date_of_leaving::date
        ELSE (
            CASE 
                WHEN p_date_of_leaving::date >= '1900-01-01' AND p_date_of_leaving::date <= '2100-12-31' 
                THEN p_date_of_leaving::date
                ELSE NULL
            END
        )
    END;

    v_parsed_issue_date := CASE 
        WHEN p_issue_date IS NULL OR p_issue_date = 'null' OR p_issue_date = 'undefined' OR p_issue_date = '' THEN NULL
        WHEN p_issue_date ~ '^\d{4}-\d{2}-\d{2}$' THEN p_issue_date::date
        ELSE (
            CASE 
                WHEN p_issue_date::date >= '1900-01-01' AND p_issue_date::date <= '2100-12-31' 
                THEN p_issue_date::date
                ELSE NULL
            END
        )
    END;

    v_parsed_birth_date := CASE 
        WHEN p_birth_date IS NULL OR p_birth_date = 'null' OR p_birth_date = 'undefined' OR p_birth_date = '' THEN NULL
        WHEN p_birth_date ~ '^\d{4}-\d{2}-\d{2}$' THEN p_birth_date::date
        ELSE (
            CASE 
                WHEN p_birth_date::date >= '1900-01-01' AND p_birth_date::date <= '2100-12-31' 
                THEN p_birth_date::date
                ELSE NULL
            END
        )
    END;

    -- Map status to production status
    v_mapped_status := CASE 
        WHEN p_status IS NULL THEN NULL
        WHEN LOWER(TRIM(p_status)) = 'left' THEN 'inactive'
        WHEN LOWER(TRIM(p_status)) IN ('yes', 'active', 'rehired') THEN 'active'
        WHEN LOWER(TRIM(p_status)) = 'yet to join' THEN 'pending'
        ELSE 'active'
    END;

    -- Check if employee exists
    SELECT id INTO v_employee_uuid 
    FROM public.employees 
    WHERE employee_id = p_employee_id;

    IF v_employee_uuid IS NULL THEN
        -- Create new employee
        v_is_new := true;
        INSERT INTO public.employees (
            employee_id,
            english_name,
            arabic_name,
            status,
            position,
            personal_email,
            qualifications,
            nationality,
            gender,
            marital_status,
            id_number,
            issuing_body,
            birth_place,
            work_phone,
            home_phone,
            nok_person,
            nok_name,
            nok_phone_number,
            category,
            date_of_joining,
            date_of_leaving,
            issue_date,
            birth_date,
            created_by
        ) VALUES (
            p_employee_id,
            p_english_name,
            p_arabic_name,
            COALESCE(v_mapped_status, 'active'),
            p_position,
            p_personal_email,
            p_qualifications,
            p_nationality,
            p_gender,
            p_marital_status,
            p_id_number,
            p_issuing_body,
            p_birth_place,
            p_work_phone,
            p_home_phone,
            p_nok_person,
            p_nok_name,
            p_nok_phone_number,
            p_category,
            v_parsed_date_of_joining,
            v_parsed_date_of_leaving,
            v_parsed_issue_date,
            v_parsed_birth_date,
            auth.uid()
        ) RETURNING id INTO v_employee_uuid;
    ELSE
        -- Update existing employee (only update non-null values)
        UPDATE public.employees SET
            english_name = COALESCE(p_english_name, english_name),
            arabic_name = COALESCE(p_arabic_name, arabic_name),
            status = COALESCE(v_mapped_status, status),
            position = COALESCE(p_position, position),
            personal_email = COALESCE(p_personal_email, personal_email),
            qualifications = COALESCE(p_qualifications, qualifications),
            nationality = COALESCE(p_nationality, nationality),
            gender = COALESCE(p_gender, gender),
            marital_status = COALESCE(p_marital_status, marital_status),
            id_number = COALESCE(p_id_number, id_number),
            issuing_body = COALESCE(p_issuing_body, issuing_body),
            birth_place = COALESCE(p_birth_place, birth_place),
            work_phone = COALESCE(p_work_phone, work_phone),
            home_phone = COALESCE(p_home_phone, home_phone),
            nok_person = COALESCE(p_nok_person, nok_person),
            nok_name = COALESCE(p_nok_name, nok_name),
            nok_phone_number = COALESCE(p_nok_phone_number, nok_phone_number),
            category = COALESCE(p_category, category),
            date_of_joining = COALESCE(v_parsed_date_of_joining, date_of_joining),
            date_of_leaving = COALESCE(v_parsed_date_of_leaving, date_of_leaving),
            issue_date = COALESCE(v_parsed_issue_date, issue_date),
            birth_date = COALESCE(v_parsed_birth_date, birth_date),
            updated_at = now()
        WHERE id = v_employee_uuid;
    END IF;

    -- Log the operation
    PERFORM public.log_audit_event(
        CASE WHEN v_is_new THEN 'employee_created'::public.audit_event_type 
             ELSE 'employee_updated'::public.audit_event_type END,
        auth.uid(),
        NULL,
        'employees',
        v_employee_uuid::text,
        NULL,
        jsonb_build_object(
            'employee_id', p_employee_id,
            'operation_type', CASE WHEN v_is_new THEN 'CREATE' ELSE 'UPDATE' END
        ),
        jsonb_build_object('operation', 'BULK_UPLOAD')
    );

    RETURN jsonb_build_object(
        'success', true,
        'employee_id', v_employee_uuid,
        'operation', CASE WHEN v_is_new THEN 'created' ELSE 'updated' END
    );
END;
$$;