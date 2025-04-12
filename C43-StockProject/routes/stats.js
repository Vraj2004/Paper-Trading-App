const express = require('express');
const router = express.Router();
const db = require('../db/db');
const path = require('path');

//materialized for COV (coefficient of variation)
async function CreateMaterializedView() {
    try {
        const result = await db.query(
            `CREATE MATERIALIZED VIEW portfolio_stats AS
            SELECT SD(close_price)/AVG(close_price) as COV FROM historical_stock
            HAVING COUNT(*) > 1;`
        );
        return;
    }
}
async function getCOV(portfolioID) {
    try {
        const result = await db.query(
            ` `
        )
    }
}


router.get('/stats/:PortfolioID', async (req, res) => { });