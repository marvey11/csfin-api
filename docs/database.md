# Database queries

## Minimum and Maximum Dates with Prices

Without context:

```sql
SELECT q.securityId AS sid, q.exchangeId AS eid, MIN(q.date) AS odate, MAX(q.date) AS ndate
FROM quotes AS q
GROUP BY sid, eid
```

With all the metadata context mixed in:

```sql
SELECT s.id AS sid, s.isin, s.name AS sname, s.type AS itype, e.id AS eid, e.name AS ename, MIN(q.date) AS oldestDate, MAX(q.date) AS newestDate
FROM quotes AS q
LEFT JOIN securities AS s ON q.securityId = s.id
LEFT JOIN exchanges AS e ON q.exchangeId = e.id
GROUP BY sid, eid
```

## Performance Data

```sql
```

## RSL Data

```sql
SELECT s.isin, s.name AS sname, s.type AS itype, e.name AS ename, last_date_of_week, q.quote AS last_price_of_week
FROM quotes AS q
LEFT JOIN securities AS s ON q.securityId = s.id
LEFT JOIN exchanges AS e ON q.exchangeId = e.id
LEFT JOIN (
	SELECT sid, eid, MAX(q.date) AS last_date_of_week
	FROM quotes AS q
	LEFT JOIN (
		SELECT sid, eid, YEARWEEK(q.date, 3) AS year_week
		FROM quotes AS q
		LEFT JOIN (
			SELECT sid, eid, MAX(q.date) AS close_date
			FROM quotes AS q
			LEFT JOIN (
				SELECT q.securityId AS sid, q.exchangeId AS eid, MAX(q.date) AS max_date
				FROM quotes AS q
				GROUP BY sid, eid
			) AS ndates ON q.securityId = ndates.sid AND q.exchangeId = ndates.eid
			WHERE q.date <= DATE_SUB(ndates.max_date, INTERVAL ((3 + WEEKDAY(ndates.max_date)) % 7) DAY)
			GROUP BY sid, eid
		) AS wcds ON q.securityId = wcds.sid AND q.exchangeId = wcds.eid
		WHERE q.date <= wcds.close_date AND q.date > DATE_SUB(wcds.close_date, INTERVAL 27 WEEK)
		GROUP BY sid, eid, YEARWEEK(q.date, 3)
	) AS weekly ON q.securityId = weekly.sid AND q.exchangeId = weekly.eid
	WHERE YEARWEEK(q.date, 3) = weekly.year_week
	GROUP BY sid, eid, year_week
) AS ldows ON q.securityId = ldows.sid AND q.exchangeId = ldows.eid
WHERE q.date = ldows.last_date_of_week
GROUP BY sid, eid, last_date_of_week
```
