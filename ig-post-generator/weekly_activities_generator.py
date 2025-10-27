#!/usr/bin/env python3
"""
Weekly Activities Generator
Generates a formatted text file with weekly activities from Google Sheets
"""

import requests
import json
from datetime import datetime, timedelta
from collections import defaultdict

# Google Sheets configuration
SPREADSHEET_ID = "1G_8RMWjf0T9sNdMxKYy_Fc051I6zhdLLy6ehLak4CX4"
API_KEY = "AIzaSyCPyerGljBK4JJ-XA3aRr5cRvWssI3rwhI"
SHEET_NAME = "formatting"

def get_google_sheet_data():
    """Fetch data from Google Sheets"""
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{SHEET_NAME}/?key={API_KEY}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data.get('values', [])
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return []

def get_week_dates():
    """Get current date to Sunday of this week"""
    today = datetime.now()
    
    # Calculate days until Sunday (0 = Monday, 6 = Sunday)
    days_until_sunday = (6 - today.weekday()) % 7
    if days_until_sunday == 0:  # If today is Sunday, get next Sunday
        days_until_sunday = 7
    
    sunday = today + timedelta(days=days_until_sunday)
    
    return today, sunday

def format_date_range(start_date, end_date):
    """Format date range as 'DD-DD/MM'"""
    if start_date.month == end_date.month:
        return f"{start_date.day}-{end_date.day}/{start_date.month:02d}"
    else:
        return f"{start_date.day}/{start_date.month:02d}-{end_date.day}/{end_date.month:02d}"

def parse_date(date_str):
    """Parse date string in DD/MM format"""
    try:
        day, month = date_str.split('/')
        current_year = datetime.now().year
        return datetime(current_year, int(month), int(day))
    except:
        return None

def is_date_in_week(date_obj, start_date, end_date):
    """Check if date is within the week range"""
    if not date_obj:
        return False
    return start_date <= date_obj <= end_date

def generate_weekly_activities():
    """Generate the weekly activities text file"""
    
    # Get data from Google Sheets
    print("Fetching data from Google Sheets...")
    data = get_google_sheet_data()
    
    if not data or len(data) < 2:
        print("No data found or insufficient data")
        return
    
    # Get week date range for filename only
    start_date, end_date = get_week_dates()
    date_range_str = format_date_range(start_date, end_date)
    
    print(f"Generating activities for week: {date_range_str}")
    
    # Group activities by category (no date filtering)
    activities_by_category = defaultdict(list)
    seen_organizers_by_category = defaultdict(set)
    
    # Process each row (skip header)
    for i, row in enumerate(data[1:], 1):
        if len(row) < 5:  # Need at least 5 columns
            continue
            
        event_name = row[0].strip() if len(row) > 0 else ""
        category = row[1].strip() if len(row) > 1 else ""
        organizer = row[2].strip() if len(row) > 2 else ""
        
        # Skip if no event name
        if not event_name:
            continue
        
        # Add organizer with @ prefix (no date filtering, no duplicates per category)
        if organizer and organizer not in seen_organizers_by_category[category]:
            activities_by_category[category].append(f"@{organizer}")
            seen_organizers_by_category[category].add(organizer)
    
    # Generate the text content
    content = f"［每週香港活動 - {date_range_str}］\n\n"
    
    # Get categories in the order they appear in the sheet (no sorting)
    categories_in_order = []
    seen_categories = set()
    
    for i, row in enumerate(data[1:], 1):
        if len(row) >= 2:
            category = row[1].strip()
            if category and category not in seen_categories:
                categories_in_order.append(category)
                seen_categories.add(category)
    
    # Generate content for each category in sheet order
    for category in categories_in_order:
        organizers = activities_by_category[category]
        if organizers:
            content += f"{category}\n"
            for organizer in organizers:  # Keep original order, no sorting
                content += f"{organizer}\n"
            content += "\n"
    
    # Save to file
    filename = f"weekly_activities_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.txt"
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Generated: {filename}")
    print("\nContent preview:")
    print(content)
    
    return filename

if __name__ == "__main__":
    generate_weekly_activities()
