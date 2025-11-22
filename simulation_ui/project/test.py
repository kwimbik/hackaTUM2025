import requests
import json

url = "http://localhost:3000/api/event"
headers = {"Content-Type": "application/json"}

data = {
    "text": "Oscar got promoted!",
    "data": {
        "name": "Oscar",
        "current_income": 75000.0,
        "family_status": "single",
        "children": 0,
        "recent_event": "promotion",
        "year": 2025,
        "month": 6
    }
}

response = requests.post(url, headers=headers, json=data)
print(response.json())