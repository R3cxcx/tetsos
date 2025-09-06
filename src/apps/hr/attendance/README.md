# Attendance App

The Attendance App is a comprehensive employee attendance management system that allows HR staff and managers to track employee attendance, working hours, and generate reports.

## Features

### Core Functionality
- **Clock In/Out Management**: Record employee attendance with timestamps, location, and notes
- **Daily Overview**: View attendance status for all employees on any given date
- **Reports & Analytics**: Generate comprehensive attendance reports with filtering options
- **Real-time Updates**: Live attendance data with automatic refresh

### Key Components

#### 1. Attendance Index (`/hr/attendance`)
- Dashboard with attendance statistics
- Quick access to all attendance features
- Recent activity feed

#### 2. Clock In/Out (`/hr/attendance/clock-in-out`)
- Dedicated interface for managing employee attendance
- Real-time clock display
- Currently working employees overview
- Recent activities log

#### 3. Daily Overview (`/hr/attendance/overview`)
- Date-based attendance viewing
- Employee search and filtering
- Status-based filtering (present, absent, late, on leave)
- Summary statistics

#### 4. Reports (`/hr/attendance/reports`)
- Configurable date ranges
- Multiple report types (daily, weekly, monthly)
- Export functionality (CSV)
- Department-based filtering
- Chart placeholders for future visualization

### Database Schema

The attendance system uses several tables:

- **`attendance_records`**: Main attendance data (clock in/out, hours, status)
- **`attendance_settings`**: System configuration (working hours, policies)
- **`attendance_policies`**: Department-specific rules
- **`attendance_leave_types`**: Leave categories and rules
- **`attendance_leave_requests`**: Leave request management
- **`attendance_overtime`**: Overtime tracking and approval

### Security & Permissions

- **Row Level Security (RLS)** enabled on all tables
- **Permission-based access**: Requires `employees.read` permission
- **User isolation**: Employees can only view their own records
- **HR access**: HR users can view and manage all records

## Usage

### For HR Staff

1. **Navigate to Attendance**: Go to `/hr` → Click "Attendance" card
2. **Clock In/Out Employees**: Use the "Clock In/Out" button or navigate to `/hr/attendance/clock-in-out`
3. **View Daily Status**: Check `/hr/attendance/overview` for daily attendance summary
4. **Generate Reports**: Use `/hr/attendance/reports` for analytics and exports

### For Employees

- View personal attendance records (future feature)
- Request leave (future feature)
- Clock in/out (if self-service enabled)

### Clock In/Out Process

1. Click "Clock In/Out" button
2. Select employee from the grid
3. System automatically detects if employee is already clocked in
4. Add optional location and notes
5. Confirm action
6. Record is saved and statistics updated

## Configuration

### Working Hours
- Default: 9:00 AM - 5:00 PM
- Configurable per department
- Late threshold: 15 minutes (configurable)

### Attendance Statuses
- **Present**: Employee clocked in on time
- **Late**: Employee clocked in after threshold
- **Absent**: No attendance record for the day
- **On Leave**: Approved leave request
- **Half Day**: Partial day attendance

### Leave Types
- Annual Leave (25 days/year)
- Sick Leave (15 days/year)
- Personal Leave (5 days/year)
- Maternity Leave (90 days)
- Bereavement Leave (5 days)
- Unpaid Leave (30 days)

## Future Enhancements

### Phase 2 Features
- **Leave Management**: Complete leave request workflow
- **Overtime Management**: Overtime approval and tracking
- **Mobile App**: Employee self-service mobile interface
- **Geolocation**: GPS-based attendance verification
- **Biometric Integration**: Fingerprint/face recognition
- **Shift Management**: Multiple shift support
- **Holiday Calendar**: Company holiday management

### Phase 3 Features
- **Advanced Analytics**: Machine learning insights
- **Predictive Attendance**: Absence prediction
- **Integration**: Payroll and HRIS integration
- **API**: External system integration
- **Notifications**: Automated alerts and reminders

## Technical Details

### Architecture
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **State Management**: React Hooks + Context
- **Data Fetching**: Custom hooks with Supabase
- **Real-time**: Supabase subscriptions (future)

### Performance
- **Indexed Queries**: Optimized database queries
- **Lazy Loading**: Components load on demand
- **Caching**: Local state management
- **Pagination**: Large dataset handling (future)

### Error Handling
- **User Feedback**: Toast notifications
- **Validation**: Form validation and error states
- **Fallbacks**: Graceful degradation
- **Logging**: Error tracking and debugging

## Troubleshooting

### Common Issues

1. **Employee Not Found**: Ensure employee exists and is active
2. **Permission Denied**: Check user has `employees.read` permission
3. **Duplicate Records**: System prevents multiple records per employee per day
4. **Time Zone Issues**: All times stored in UTC, displayed in local time

### Support

For technical issues or feature requests:
1. Check the application logs
2. Verify database connectivity
3. Review user permissions
4. Contact the development team

## Contributing

When adding new features to the attendance app:

1. **Follow Patterns**: Use existing component and hook patterns
2. **Type Safety**: Maintain strict TypeScript typing
3. **Testing**: Add tests for new functionality
4. **Documentation**: Update this README
5. **Database**: Create migrations for schema changes
6. **Security**: Implement proper RLS policies

## Related Documentation

- [HR Module Overview](../../README.md)
- [Database Schema](../../../integrations/supabase/types.ts)
- [Authentication & Permissions](../../../contexts/AuthContext.tsx)
- [UI Components](../../../components/ui/)
