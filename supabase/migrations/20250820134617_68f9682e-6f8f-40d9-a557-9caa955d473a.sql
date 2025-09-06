-- Create an employee record for the recruiter user so they can access employee self service
INSERT INTO public.employees (
  user_id,
  employee_id,
  english_name,
  arabic_name,
  status,
  category,
  position,
  nationality,
  date_of_joining,
  created_by
) VALUES (
  'b7f9d482-5c57-4463-b2d1-dbf97f29f8a2',
  'EMP001',
  'Awny Ossama',
  'أوني أسامة',
  'active',
  'Regular',
  'Recruiter',
  'Egyptian',
  '2024-01-01',
  'b7f9d482-5c57-4463-b2d1-dbf97f29f8a2'
);