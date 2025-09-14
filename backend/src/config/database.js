// Configurazione Sequelize
const { Sequelize } = require('sequelize');
require('dotenv').config();


const connectionString = process.env.DATABASE_URL || 'postgres://cowork:coworkpass@db:5432/coworkdb';


const sequelize = new Sequelize(connectionString, {
dialect: 'postgres',
logging: false,
});


module.exports = sequelize;