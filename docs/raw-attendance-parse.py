import pandas as pd
import re
import tkinter as tk
from tkinter import filedialog

# Hide the root Tkinter window
root = tk.Tk()
root.withdraw()


# Step 1: Prompt user for TXT file and convert it to Excel


# Open a file dialog to select the TXT file
txt_input_file = filedialog.askopenfilename(
    title="Select the TXT file to process",
    filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
)

if not txt_input_file:
    print("No file selected. Exiting.")
    exit()

# Define a temporary Excel file to store the converted data
converted_excel_file = "Converted.xlsx"

# Read the text file
with open(txt_input_file, "r", encoding="utf-8") as file:
    lines = file.readlines()

# Prepare a list to hold extracted data
data = []

# Regex pattern explanation:
#   Group 1: Employee ID (non-whitespace)
#   Group 2: Name (non-greedy until next whitespace sequence)
#   Group 3: ClockingTime (expected in dd-mm-yyyy hh:mm:ss format)
#   Group 4: TerminalDescription (the rest of the line)
pattern = re.compile(r"(\S+)\s+(.+?)\s+(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})\s+(.+)")
for line in lines:
    line = line.strip()
    match = pattern.match(line)
    if match:
        data.append(match.groups())

# Create a DataFrame with the required column names
df = pd.DataFrame(data, columns=["employeeID", "Name", "ClockingTime", "TerminalDescription"])

# Save the DataFrame to an Excel file for further processing
df.to_excel(converted_excel_file, index=False)
print(f"Step 1 complete: Converted file saved as '{converted_excel_file}'.")


##########################
# Step 2: Process the Converted Excel File
##########################

# 1. Load the Excel file produced in Step 1
df = pd.read_excel(converted_excel_file)

# 2. Process the data

# Convert 'ClockingTime' to datetime (assuming day-first date format)
df['ClockingTime'] = pd.to_datetime(df['ClockingTime'], dayfirst=True, errors='coerce')

# Extract the date part for grouping
df['Date'] = df['ClockingTime'].dt.date

# Separate records into clock-in and clock-out based on time
# (Here we use 8.9 as a threshold for before 9:00 AM)
in_df = df[df['ClockingTime'].dt.hour <= 9].copy()
out_df = df[df['ClockingTime'].dt.hour > 9].copy()

# For each employee and date, get the first clock-in (minimum time)
in_group = in_df.loc[in_df.groupby(['employeeID', 'Name', 'Date'])['ClockingTime'].idxmin(),
                     ['employeeID', 'Name', 'Date', 'ClockingTime', 'TerminalDescription']]
in_group.rename(columns={'ClockingTime': 'Clock In Time', 'TerminalDescription': 'Terminal In'}, inplace=True)

# For each employee and date, get the last clock-out (maximum time)
out_group = out_df.loc[out_df.groupby(['employeeID', 'Name', 'Date'])['ClockingTime'].idxmax(),
                       ['employeeID', 'Name', 'Date', 'ClockingTime', 'TerminalDescription']]
out_group.rename(columns={'ClockingTime': 'Clock Out Time', 'TerminalDescription': 'Terminal Out'}, inplace=True)

# Merge the clock-in and clock-out records using an outer join
result = pd.merge(in_group, out_group, on=['employeeID', 'Name', 'Date'], how='outer')

# Format the clock times to hh:mm format
result['Clock In Time'] = result['Clock In Time'].dt.strftime('%H:%M')
result['Clock Out Time'] = result['Clock Out Time'].dt.strftime('%H:%M')

# Format the Date column to dd-mm-yyyy format
result['Date'] = pd.to_datetime(result['Date']).dt.strftime('%d-%m-%Y')

# Create a Weekday column based on the Date column
result['Weekday'] = pd.to_datetime(result['Date'], format='%d-%m-%Y').dt.day_name()

# Rename columns for clarity (capitalizing employeeID)
result.rename(columns={'employeeID': 'Employee ID'}, inplace=True)

# 3. Export the processed data to a new Excel file
output_file = "ROO-UPDATED.xlsx"
result.to_excel(output_file, index=False)

print(f"Step 2 complete: Processed data has been saved to '{output_file}'.")

