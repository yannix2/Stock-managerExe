const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

    // Connexion SQLite locale
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, 'database.sqlite'),
        logging: false
    });

// ----------------- MODELS ------------------
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    CodeSecret: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true });
// 1️⃣ Products
const Product = sequelize.define('Product', {
    name: { type: DataTypes.STRING, allowNull: false },
    reference: { type: DataTypes.STRING, allowNull: false, unique: true },
    category: DataTypes.STRING,
    brand: DataTypes.STRING,
    origin: DataTypes.STRING,
    compatible_references: DataTypes.TEXT,
    description: DataTypes.TEXT,
    quantity_in_stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    threshold: { type: DataTypes.INTEGER, allowNull: false },
    purchase_price: DataTypes.FLOAT,
    selling_price: DataTypes.FLOAT,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { timestamps: true });

// 2️⃣ Customers
const Customer = sequelize.define('Customer', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    address: DataTypes.STRING,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { timestamps: true });

// 3️⃣ Invoices / Quotes
const Invoice = sequelize.define('Invoice', {
    reference: { type: DataTypes.STRING, unique: true },
    type: { type: DataTypes.ENUM('invoice', 'quote'), allowNull: false },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    due_date: DataTypes.DATE,
    status: { type: DataTypes.ENUM('pending', 'paid', 'cancelled',"nostatus"), defaultValue: 'pending' },
    total: { type: DataTypes.FLOAT, defaultValue: 0 },
    notes: DataTypes.TEXT
}, { timestamps: true });

// 4️⃣ Invoice Items (lignes facture / devis)
const InvoiceItem = sequelize.define('InvoiceItem', {
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unit_price: { type: DataTypes.FLOAT, allowNull: false },
    total_price: { type: DataTypes.FLOAT, allowNull: false }
}, { timestamps: true });

// 5️⃣ Stock Alerts
const StockAlert = sequelize.define('StockAlert', {
    type: { type: DataTypes.ENUM('low_stock', 'out_of_stock'), allowNull: false },
    message: { type: DataTypes.STRING, allowNull: false },
    resolved: { type: DataTypes.BOOLEAN, defaultValue: false },
    resolved_at: DataTypes.DATE
}, { timestamps: true });

// 6️⃣ Payments
const Payment = sequelize.define('Payment', {
    amount: { type: DataTypes.FLOAT, allowNull: false },
    payment_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    method: DataTypes.STRING, // cash, card, bank transfer...
    notes: DataTypes.TEXT
}, { timestamps: true });

// ----------------- RELATIONS ------------------

// Invoice -> Customer
Customer.hasMany(Invoice, { foreignKey: 'customerId' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId' });

// InvoiceItem -> Invoice & Product
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });

Product.hasMany(InvoiceItem, { foreignKey: 'productId' });
InvoiceItem.belongsTo(Product, { foreignKey: 'productId' });

// StockAlert -> Product
Product.hasMany(StockAlert, { foreignKey: 'productId' });
StockAlert.belongsTo(Product, { foreignKey: 'productId' });

// Payment -> Invoice
Invoice.hasMany(Payment, { foreignKey: 'invoiceId' });
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId' });

module.exports = {
    sequelize,
    Product,
    Customer,
    Invoice,
    InvoiceItem,
    StockAlert,
    Payment,User
};
