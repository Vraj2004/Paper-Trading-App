-- First we created a seperate excel with all the unique stock values
-- We used the command below:

-- awk -F, 'NR == 1 {print "symbol,curr_value"; next} {print $7",0.00"}' /home/postgres/fixed_SP500History.csv | sort -u > /home/postgres/stock_symbols.csv

-- Here we copy all the data to our stock table
COPY stock(symbol, curr_value)
-- change the path to your own path
FROM '/home/postgres/stock_symbols.csv'
DELIMITER ',' CSV HEADER;

-- Now we need to load our data from SP500History.csv to dailyStock table

-- We formatted the table a bit differently then the csv file, so 
-- we used awk to reformat it before loading the data
-- awk -F',' 'NR==1 {print "timestamp,symbol,open_price,high_price,low_price,close_price,volume"; next} {print $1","$7","$2","$3","$4","$5","$6}' /home/postgres/SP500History.csv > /home/postgres/dailyStockLoader.csv

COPY dailyStock(timestamp, symbol, open_price, high_price, low_price, close_price, volume)
FROM '/home/postgres/dailyStockLoader.csv'
DELIMITER ',' CSV HEADER;

-- Now we have loaded both the stock table along with the dailyStock table


-- Update for already loaded data: 
UPDATE stock s
SET curr_value = d.close_price
FROM (
    SELECT DISTINCT ON (symbol) symbol, close_price
    FROM dailyStock
    ORDER BY symbol, timestamp DESC
) d
WHERE s.symbol = d.symbol;

--UPDATE for already loaded data:
UPDATE stock s
SET COV = subquery.stddev_close_price / subquery.avg_close_price
FROM (
    SELECT 
        symbol,
        STDDEV(close_price) AS stddev_close_price,
        AVG(close_price) AS avg_close_price
    FROM dailyStock
    GROUP BY symbol
) subquery
WHERE s.symbol = subquery.symbol;


--UPDATE for already loaded data:


INSERT INTO market (timestamp, volume, avg_close)
SELECT 
    timestamp,
    SUM(volume) AS total_volume, -- Total market volume (optional)
    AVG(close_price) AS avg_close
FROM historical_stock 
GROUP BY timestamp;


--UPDATE TO ADD BETA
UPDATE stock s
SET beta = sub.beta
FROM (
    SELECT 
        ds.symbol,
        -- Calculate beta = Cov(stock_close, market_avg_close) / Var(market_avg_close)
        COVAR_POP(ds.close_price, m.avg_close) / NULLIF(VAR_POP(m.avg_close), 0) AS beta
    FROM historical_stock ds
    JOIN market m ON ds.timestamp = m.timestamp
    GROUP BY ds.symbol
) sub
WHERE s.symbol = sub.symbol;


CREATE OR REPLACE FUNCTION update_stock_value()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stock
    SET curr_value = NEW.close_price
    WHERE symbol = NEW.symbol;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER update_stock_trigger
AFTER INSERT ON dailyStock
FOR EACH ROW
EXECUTE FUNCTION update_stock_value();

