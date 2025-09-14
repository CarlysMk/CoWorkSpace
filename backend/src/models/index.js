const Sequelize = require('sequelize');
const sequelize = require('../config/database');


const User = require('./user');
const Location = require('./location');
const Space = require('./space');
const Booking = require('./booking');


// Inizializza i modelli con l'istanza di sequelize
const models = {
User: User(sequelize, Sequelize.DataTypes),
Location: Location(sequelize, Sequelize.DataTypes),
Space: Space(sequelize, Sequelize.DataTypes),
Booking: Booking(sequelize, Sequelize.DataTypes),
};


// Associazioni
models.Location.hasMany(models.Space, { foreignKey: 'location_id' });
models.Space.belongsTo(models.Location, { foreignKey: 'location_id' });


models.User.hasMany(models.Booking, { foreignKey: 'user_id' });
models.Booking.belongsTo(models.User, { foreignKey: 'user_id' });
models.Space.hasMany(models.Booking, { foreignKey: 'space_id' });
models.Booking.belongsTo(models.Space, { foreignKey: 'space_id' });


module.exports = { sequelize, ...models };