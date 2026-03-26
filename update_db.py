import urllib.request
import json
import sys

db_url = "https://kesher-63596-default-rtdb.europe-west1.firebasedatabase.app/guards.json"

req = urllib.request.Request(db_url)
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
except Exception as e:
    print("Error reading db:", e)
    sys.exit(1)

def create_shifts(us_shifts):
    all_shifts = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]
    return { t: ("?" if t in us_shifts else "פלס״ם") for t in all_shifts }

pm_us = ["12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]
am_us = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00"]

dates = [
    ("day3", "רביעי, 18.3", pm_us),
    ("day4", "חמישי, 19.3", pm_us),
    ("day5", "שישי, 20.3", pm_us),
    ("day6", "שבת, 21.3", pm_us),
    ("day7", "ראשון, 22.3", am_us),
    ("day8", "שני, 23.3", am_us),
    ("day9", "שלישי, 24.3", am_us),
    ("day10", "רביעי, 25.3", pm_us),
    ("day11", "חמישי, 26.3", pm_us),
    ("day12", "שישי, 27.3", pm_us),
    ("day13", "שבת, 28.3", pm_us),
    ("day14", "ראשון, 29.3", am_us),
    ("day15", "שני, 30.3", am_us),
    ("day16", "שלישי, 31.3", am_us),
    ("day17", "רביעי, 1.4", pm_us),
    ("day18", "חמישי, 2.4", pm_us),
    ("day19", "שישי, 3.4", pm_us),
    ("day20", "שבת, 4.4", pm_us),
    ("day21", "ראשון, 5.4", am_us),
    ("day22", "שני, 6.4", am_us),
    ("day23", "שלישי, 7.4", am_us),
    ("day24", "רביעי, 8.4", pm_us),
    ("day25", "חמישי, 9.4", pm_us),
    ("day26", "שישי, 10.4", pm_us),
    ("day27", "שבת, 11.4", pm_us)
]

for day_key, day_name, us_shifts in dates:
    order = int(day_key.replace("day", ""))
    new_shifts = create_shifts(us_shifts)
    
    if day_key in data:
        # Keep existing assignees if they are now our shifts
        for t in new_shifts:
            if new_shifts[t] == "?" and t in data[day_key]["shifts"]:
                val = data[day_key]["shifts"][t]
                if val and val not in ["?", "פלס״ם"]:
                    new_shifts[t] = val
                    
    data[day_key] = {
        "name": day_name,
        "order": order,
        "shifts": new_shifts
    }

# Ensure day1 and day2 exist in new mapping just to not break them
# Actually we just keep data[day_key] as is.

req_put = urllib.request.Request(db_url, data=json.dumps(data).encode('utf-8'), method='PUT')
req_put.add_header('Content-Type', 'application/json')
try:
    with urllib.request.urlopen(req_put) as res:
        pass
    print("Database updated!")
except Exception as e:
    print("Error saving to db:", e)
