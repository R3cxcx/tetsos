-- Create enum for hiring request status first
CREATE TYPE hiring_request_status AS ENUM (
  'pending_rm_approval',
  'approved_by_rm',
  'rejected_by_rm',
  'pending_hr_approval',
  'approved_by_hr',
  'rejected_by_hr',
  'pending_pd_approval',
  'approved_by_pd',
  'rejected_by_pd',
  'pending_payroll',
  'approved_by_payroll',
  'rejected_by_payroll',
  'contract_generated',
  'hired',
  'rejected'
);