const https = require('https');

const db_url = "https://kesher-63596-default-rtdb.europe-west1.firebasedatabase.app/guards.json";

https.get(db_url, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
        let data = JSON.parse(raw) || {};

        const create_shifts = (usTimes) => {
            const allTimes = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
            const shifts = {};
            for (let time of allTimes) {
                shifts[time] = usTimes.includes(time) ? "?" : "פלס״ם";
            }
            return shifts;
        };

        const pmUs = ["12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
        const amUs = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00"];

        const dates = [
            ["day3", "רביעי, 18.3", pmUs],
            ["day4", "חמישי, 19.3", pmUs],
            ["day5", "שישי, 20.3", pmUs],
            ["day6", "שבת, 21.3", pmUs],
            ["day7", "ראשון, 22.3", amUs],
            ["day8", "שני, 23.3", amUs],
            ["day9", "שלישי, 24.3", amUs],
            ["day10", "רביעי, 25.3", pmUs],
            ["day11", "חמישי, 26.3", pmUs],
            ["day12", "שישי, 27.3", pmUs],
            ["day13", "שבת, 28.3", pmUs]
        ];

        for (let [day_key, day_name, us_shifts] of dates) {
            const order = parseInt(day_key.replace("day", ""));
            const new_shifts = create_shifts(us_shifts);

            if (data[day_key] && data[day_key].shifts) {
                for (let t in new_shifts) {
                    if (new_shifts[t] === "?" && data[day_key].shifts[t]) {
                        const val = data[day_key].shifts[t];
                        if (val && val !== "?" && val !== "פלס״ם") {
                            new_shifts[t] = val;
                        }
                    }
                }
            }

            data[day_key] = {
                name: day_name,
                order: order,
                shifts: new_shifts
            };
        }

        const payload = JSON.stringify(data);
        const req = https.request(db_url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (resPut) => {
            console.log("Status: " + resPut.statusCode);
        });
        req.write(payload);
        req.end();
    });
}).on('error', e => console.error(e));
