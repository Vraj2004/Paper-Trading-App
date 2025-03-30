-- First we created a seperate excel with all the unique stock values
-- We used the command below:

-- awk -F, 'NR == 1 {print "symbol,curr_value"; next} {print $7",0.00"}' /home/postgres/fixed_SP500History.csv | sort -u > /home/postgres/stock_symbols.csv

-- Here we copy all the data to our stock table
COPY stock(symbol, curr_value)
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

-- Create triggers (later)

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

