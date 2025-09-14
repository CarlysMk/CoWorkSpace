module.exports = (sequelize, DataTypes) => {
const Space = sequelize.define('Space', {
location_id: DataTypes.INTEGER,
name: DataTypes.STRING,
type: DataTypes.STRING,
capacity: DataTypes.INTEGER,
price_per_hour: DataTypes.DECIMAL(8,2)
}, { timestamps: false, tableName: 'Spaces' });
return Space;
};