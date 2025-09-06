# Raw Data Upload Tool for Attendance

## Overview

The Raw Data Upload tool is designed to handle attendance data from fingerprint devices that use different ID systems than the HR system. This tool bridges the gap between fingerprint device User IDs and HR Employee IDs.

## Features

### 1. Raw Data Upload
- **File Support**: Uploads `.txt`, `.xlsx`, `.xls`, and `.csv` files
- **Text File Parsing**: Automatically parses text files using regex patterns similar to the Python script (`code.py`)
- **Data Validation**: Validates file format and data integrity
- **Batch Processing**: Handles large datasets efficiently

### 2. User ID Mapping Management
- **Mapping Creation**: Create mappings between fingerprint device User IDs and HR Employee IDs
- **Mapping Management**: View, edit, and delete existing mappings
- **Employee Search**: Search through available employees to find the correct mapping

### 3. Data Processing
- **Automatic Processing**: Processes raw attendance data to extract clock in/out times
- **Duplicate Handling**: Groups multiple records per user per day
- **Time Logic**: Automatically determines first (clock in) and last (clock out) records

## Database Schema

### Tables Created

#### `raw_attendance_data`
Stores the raw fingerprint device data before processing:
- `id`: Unique identifier
- `user_id`: Fingerprint device User ID
- `employee_id`: HR Employee ID (nullable until mapped)
- `name`: Employee name from device
- `clocking_time`: Timestamp of the clock event
- `terminal_description`: Device/terminal information
- `processed`: Flag indicating if data has been processed
- `created_at`, `updated_at`: Timestamps

#### `user_id_mapping`
Maps fingerprint device User IDs to HR Employee IDs:
- `id`: Unique identifier
- `user_id`: Fingerprint device User ID
- `employee_id`: HR Employee ID
- `created_at`, `updated_at`: Timestamps

## Usage

### 1. Setting Up User ID Mappings

Before uploading raw data, you need to establish mappings between fingerprint device User IDs and HR Employee IDs:

1. Navigate to **Attendance Management** → **User ID Mapping**
2. Click **Add New Mapping**
3. Enter the fingerprint device User ID
4. Select the corresponding HR Employee ID
5. Save the mapping

### 2. Uploading Raw Data

1. Navigate to **Attendance Management** → **Raw Data Upload**
2. Upload your attendance data file (`.txt`, `.xlsx`, `.xls`, or `.csv`)
3. Review the data preview and mapping status
4. Ensure all users are mapped before proceeding
5. Click **Upload to Database** to store the raw data

### 3. Processing Raw Data

1. After uploading, click **Process Data** to convert raw data to attendance records
2. The system will:
   - Group records by user and date
   - Extract clock in/out times
   - Mark raw data as processed
   - Generate attendance records

## File Format Requirements

### Text File Format (`.txt`)
```
EmployeeID    EmployeeName    Date Time    Terminal ID    User ID
5990          mutrtada nadhum    02-01-2025 06:59:32    SR MKz    IG5990
```

### Excel/CSV Format
Columns should include:
- **Employee ID**: HR system Employee ID
- **Name**: Employee name
- **Clocking Time**: Date and time of the event
- **Terminal ID**: Device or terminal identifier
- **User ID**: Fingerprint device User ID

## Data Processing Logic

The tool follows the same logic as the Python script (`code.py`):

1. **Grouping**: Groups records by User ID and date
2. **Time Sorting**: Sorts records chronologically within each group
3. **Clock In**: First record of the day (earliest time)
4. **Clock Out**: Last record of the day (latest time)
5. **Processing**: Converts raw data to structured attendance records

## Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Permission-based Access**: Requires appropriate attendance permissions
- **Audit Trail**: Tracks creation and modification timestamps

## Error Handling

- **Validation Errors**: File format and data validation
- **Mapping Errors**: Unmapped users prevent upload
- **Processing Errors**: Detailed error messages for troubleshooting
- **Rollback Support**: Failed operations don't affect existing data

## Integration

The tool integrates with:
- **Attendance Management System**: Processes data into attendance records
- **Employee Management**: Links to employee data
- **Reporting System**: Provides data for attendance reports

## Troubleshooting

### Common Issues

1. **Unmapped Users**: Ensure all fingerprint device User IDs are mapped to HR Employee IDs
2. **File Format**: Verify file format matches expected structure
3. **Data Validation**: Check for missing or invalid data in uploaded files
4. **Permissions**: Ensure user has appropriate attendance management permissions

### Support

For technical support or questions about the Raw Data Upload tool, contact the HR system administrator or refer to the system documentation.
