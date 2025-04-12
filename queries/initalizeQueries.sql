-- These are all the queries that we used to create our database
-- and initialize all the tables

CREATE DATABASE stockproject;

-- Create Stock Table
CREATE TABLE stock (
    symbol VARCHAR(10) PRIMARY KEY,
    curr_value NUMERIC(10, 2) CHECK (curr_value >= 0)
    cov NUMERIC(10, 2),
    beta NUMERIC(10, 2)
);




-- Create Users Table
CREATE TABLE users (
    userID SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL CHECK (LENGTH(password) >= 8)
);

-- Create Friend Request Table
CREATE TABLE friendReq (
    senderID INT REFERENCES users(userID),
    receiverID INT REFERENCES users(userID),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected')) NOT NULL,
    PRIMARY KEY (senderID, receiverID)
);
-- Create a trigger to update last_updated column on friendReq table
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_updated
BEFORE UPDATE ON friendReq
FOR EACH ROW
EXECUTE FUNCTION update_last_updated();


-- Create Stock List Table
CREATE TABLE stocklist (
    stocklistID SERIAL PRIMARY KEY,
    ownerID INT REFERENCES users(userID),
    priv_status VARCHAR(20) CHECK (priv_status IN ('private', 'shared', 'public')) NOT NULL
);

CREATE TABLE stocklistStock (
    stocklistID INT REFERENCES stocklist(stocklistID),
    symbol VARCHAR(10) REFERENCES stock(symbol),
    PRIMARY KEY (stocklistID, symbol)
);
-- Create Shared Stock List Table
CREATE TABLE sharedStockList (
    stocklistID INT REFERENCES stocklist(stocklistID),
    friendID INT REFERENCES users(userID),
    PRIMARY KEY (stocklistID, friendID)
);

-- Create Review Table
CREATE TABLE review (
    reviewID SERIAL PRIMARY KEY,
    stocklistID INT REFERENCES stocklist(stocklistID),
    reviewerID INT REFERENCES users(userID),
    content TEXT,
    vis_status VARCHAR(20) CHECK (vis_status IN ('private', 'public')) NOT NULL
);

-- Create Portfolio Table
CREATE TABLE portfolio (
    portfolioID SERIAL PRIMARY KEY,
    ownerID INT REFERENCES users(userID),
    cashAmount DECIMAL(20, 2) DEFAULT 0.00 CHECK (cashAmount >= 0)
);

-- Create Holding Table
CREATE TABLE holding (
    portfolioID INT REFERENCES portfolio(portfolioID),
    symbol VARCHAR(10) REFERENCES stock(symbol),
    volume DECIMAL(20, 2) CHECK (volume >= 0),
    PRIMARY KEY (portfolioID, symbol)
);

-- Create Transaction Table
CREATE TABLE transaction (
    ID SERIAL PRIMARY KEY,
    portfolioID INT REFERENCES portfolio(portfolioID),
    symbol VARCHAR(10) REFERENCES stock(symbol),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(20) CHECK (type IN ('buy', 'sell', 'add_cash', 'withdraw_cash')),
    quantity DECIMAL(20, 2) CHECK (quantity >= 0),
    unit_price DECIMAL(20, 2) CHECK (unit_price >= 0)
);

-- Create Daily Stock Table
CREATE TABLE dailyStock (
    timestamp DATE,
    symbol VARCHAR(10) REFERENCES stock(symbol),
    open_price DECIMAL(20, 2),
    high_price DECIMAL(20, 2),
    low_price DECIMAL(20, 2),
    close_price DECIMAL(20, 2),
    volume BIGINT CHECK (volume >= 0),
    PRIMARY KEY (timestamp, symbol)
);

CREATE TABLE market (
    timestamp DATE PRIMARY KEY,
    volume BIGINT,          -- Total market volume (sum of all symbol volumes)
    avg_close DECIMAL(20, 2) -- Sum of close_price for all symbols (equal weighting)
);
