module.exports = (sequelize, DataTypes) => {
const Location = sequelize.define('Location', {
name: DataTypes.STRING,
city: DataTypes.STRING,
address: DataTypes.STRING
}, { timestamps: false, tableName: 'Locations' });
return Location;
};