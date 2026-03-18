import urllib.request
import json
import sys

db_url = "https://kesher-63596-default-rtdb.europe-west1.firebasedatabase.app/guards.json"

req = urllib.request.Request(db_url)
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        for day in ['day3', 'day4', 'day5', 'day6', 'day7']:
            if day in data:
                print(day, data[day]["shifts"])
            else:
                print(day, "not found")
except Exception as e:
    print("Error reading db:", e)
    sys.exit(1)
