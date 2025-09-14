module.exports = (sequelize, DataTypes) => {
const Booking = sequelize.define('Booking', {
user_id: DataTypes.INTEGER,
space_id: DataTypes.INTEGER,
start_ts: DataTypes.DATE,
end_ts: DataTypes.DATE,
status: { type: DataTypes.STRING, defaultValue: 'confirmed' }
}, { timestamps: false, tableName: 'Bookings' });
return Booking;
};