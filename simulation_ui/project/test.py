#!/usr/bin/env python3
"""
Test script for event queuing feature
Demonstrates sending events to branches that don't exist yet
"""

import requests
import time

API_URL = "http://localhost:3000/api/event"

def send_event(branch_id, event_name, year, month):
    """Send an event to a specific branch"""
    payload = {
        "text": f"Branch {branch_id}: {event_name}",
        "data": {
            "name": "TestUser",
            "recent_event": event_name,
            "year": year,
            "month": month,
            "branchId": branch_id,
            "current_income": 60000 + (branch_id * 5000),
            "family_status": "single",
            "children": 0
        }
    }
    
    try:
        response = requests.post(API_URL, json=payload, timeout=5)
        if response.status_code == 200:
            print(f"✓ Sent event to branch #{branch_id}: {event_name} at {year}-{month:02d}")
            return True
        else:
            print(f"✗ Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_queue_future_branches():
    """Test queuing events for branches that don't exist yet"""
    print("\n" + "="*60)
    print("TEST: Queue Events for Future Branches")
    print("="*60)
    print("\n📋 Sending events for branches #0 through #10...")
    print("   Note: Only branch #0 exists initially!\n")
    
    # Define events for multiple branches
    events = [
        (0, "promotion", 2025, 3),      # Branch 0 exists
        (1, "marry", 2025, 4),          # Branch 1 doesn't exist yet!
        (1, "have_first_child", 2025, 5),  # Another event for branch 1
        (2, "bonus", 2025, 6),         # Branch 2 doesn't exist yet!
        (3, "income_increase", 2027, 5),   # Branch 3 doesn't exist yet!
        (4, "go_on_vacation", 2028, 7),    # Branch 4 doesn't exist yet!
        (5, "buy_second_car", 2029, 2),    # Branch 5 doesn't exist yet!
    ]
    
    for branch_id, event_name, year, month in events:
        send_event(branch_id, event_name, year, month)
        time.sleep(0.2)
    
    print("\n" + "="*60)
    print("✅ All events sent!")
    print("="*60)
    print("\nWhat should happen:")
    print("  1. Event for branch #0 → Created immediately")
    print("  2. Events for branches #1-5 → Queued")
    print("  3. When you split branches in the UI:")
    print("     - Branch #1 created → 2 events appear on its timeline")
    print("     - Branch #2 created → 1 event appears")
    print("     - Branch #3 created → 1 event appears")
    print("     - etc.")
    print("\n💡 Check browser console for detailed logs!")
    print("="*60)

def test_realistic_scenario():
    """Test realistic multi-branch scenario"""
    print("\n" + "="*60)
    print("TEST: Realistic Life Timeline Scenario")
    print("="*60)
    print("\n📖 Creating a story with multiple timelines...\n")
    
    # Main timeline - successful career path
    print("Branch #0: Main Timeline (Successful Career)")
    send_event(0, "promotion", 2025, 6)
    send_event(0, "bonus", 2025, 12)
    send_event(0, "marry", 2026, 9)
    time.sleep(0.3)
    
    # Alternate timeline 1 - stayed single, focused on career
    print("\nBranch #1: Alternate (Stayed Single)")
    send_event(1, "promotion", 2027, 3)
    send_event(1, "change_career", 2029, 1)
    send_event(1, "income_increase", 2030, 6)
    time.sleep(0.3)
    
    # Alternate timeline 2 - got married, had kids
    print("\nBranch #2: Alternate (Family Focus)")
    send_event(2, "have_first_child", 2028, 4)
    send_event(2, "buy_second_car", 2029, 11)
    send_event(2, "have_second_child", 2030, 7)
    time.sleep(0.3)
    
    # Alternate timeline 3 - bad luck
    print("\nBranch #3: Alternate (Challenges)")
    send_event(3, "layoff", 2027, 2)
    send_event(3, "new_job", 2027, 8)
    send_event(3, "house_damage_minor", 2029, 5)
    
    print("\n" + "="*60)
    print("✅ Story timeline created!")
    print("="*60)
    print("\n📚 You've created a complete life story with 4 branches:")
    print("  • Branch #0: Promotion → Bonus → Marriage")
    print("  • Branch #1: Career changes and growth (queued)")
    print("  • Branch #2: Starting a family (queued)")
    print("  • Branch #3: Facing challenges (queued)")
    print("\n🎬 Split branches in the UI to see each story unfold!")
    print("="*60)

def main():
    print("\n" + "="*60)
    print("Event Queuing Test Suite")
    print("="*60)
    print("\n⚠️  Make sure the server is running:")
    print("   npm start")
    print("\n⚠️  Make sure the simulation is ready:")
    print("   - Fill in onboarding form")
    print("   - Click OK to start simulation")
    print("   - Pause the simulation if needed")
    print("\n" + "="*60)
    
    input("\nPress Enter to start Test 1 (Queue Future Branches)...")
    test_queue_future_branches()
    
    print("\n\n")
    input("Press Enter to start Test 2 (Realistic Scenario)...")
    test_realistic_scenario()
    
    print("\n\n")
    print("="*60)
    print("All tests complete!")
    print("="*60)
    print("\n🎮 Now go to the simulation and:")
    print("  1. Click 'Split 1' button multiple times")
    print("  2. Watch events appear on new branches")
    print("  3. Check browser console for queue logs")
    print("\n📊 Expected console output:")
    print("  ⏳ Branch #X doesn't exist yet - queueing event")
    print("  📦 Applying N queued event(s) for branch #X")
    print("  ✓ Queue cleared for branch #X")
    print("="*60)

if __name__ == "__main__":
    main()