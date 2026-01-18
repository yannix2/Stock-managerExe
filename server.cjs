
const { authMiddleware } = require('./authmiddelware.cjs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sequelize,User, Product, Customer, Invoice, InvoiceItem, StockAlert, Payment } = require('./db/models');
const { Op } = require('sequelize');
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PDFDocument, rgb, StandardFonts,degrees } = require('pdf-lib');
const app = express();
const fs = require('fs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = 3000;

app.use(cors({ origin: '*' })); // allow all origins
app.use(bodyParser.json());
app.get('/', (req, res) => {
  res.send('API de gestion de stock fonctionne !');
});
// -------------------- TEST CONNEXION --------------------
sequelize.authenticate()
  .then(() => console.log('Connexion SQLite réussie !'))
  .catch(err => console.error('Erreur connexion DB :', err));
app.get('/ping', (req, res) => {
  res.send('pong');
});
const JWT_SECRET ="testtttttttttt"
app.get('/api/secure', authMiddleware, (req, res) => {
  res.json({ message: 'Accès autorisé', user: req.user });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, CodeSecret } = req.body;

    if (!username || !password || !CodeSecret) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ error: 'Utilisateur déjà existant' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      CodeSecret
    });

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, CodeSecret } = req.body;
console.log(req.body);
    if (!username || !password || !CodeSecret) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Check secret code
    if (CodeSecret !== user.CodeSecret) {
      console.log(typeof CodeSecret, CodeSecret);
console.log(typeof user.CodeSecret, user.CodeSecret);
      return res.status(401).json({ error: 'Code secret incorrect' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------- ROUTES PRODUITS --------------------
app.get('/api/allproducts', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/products/low-stock', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: sequelize.and(
        { is_active: true },
        sequelize.where(
          sequelize.col('quantity_in_stock'),
          '<=',
          sequelize.col('threshold')
        )
      ),
      order: [['quantity_in_stock', 'ASC']]
    });

    res.json({
      count: products.length,
      products
    });

  } catch (err) {
    console.error('LOW STOCK ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});
// Tous les produits (sans filtre)
app.get('/api/products', async (req, res) => {
  try {
    const { name, category, brand, minStock, maxStock } = req.query;

    const whereConditions = { is_active: true }; // on ne récupère que les produits actifs

    // Recherche globale (name / reference / compatible) insensible à la casse simple
    if (name) {
      const nameLower = name.toLowerCase();
      whereConditions[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), 'LIKE', `%${nameLower}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('reference')), 'LIKE', `%${nameLower}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('compatible_references')), 'LIKE', `%${nameLower}%`)
      ];
    }

    // Category
    if (category) {
      const catLower = category.toLowerCase();
      whereConditions.category = sequelize.where(
        sequelize.fn('LOWER', sequelize.col('category')),
        'LIKE',
        `%${catLower}%`
      );
    }

    // Brand
    if (brand) {
      const brandLower = brand.toLowerCase();
      whereConditions.brand = sequelize.where(
        sequelize.fn('LOWER', sequelize.col('brand')),
        'LIKE',
        `%${brandLower}%`
      );
    }

    // Stock filters
    if (minStock || maxStock) {
      const stockCond = {};
      if (minStock) stockCond[Op.gte] = Number(minStock);
      if (maxStock) stockCond[Op.lte] = Number(maxStock);
      whereConditions.quantity_in_stock = stockCond;
    }

    const products = await Product.findAll({ where: whereConditions });
    res.json(products);

  } catch (err) {
    console.error('FILTER ERROR:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Filtrage intelligent
app.get('/api/products', async (req, res) => {
  try {
    const { name, category, brand, minStock, maxStock } = req.query;
    const whereConditions = [];

    // Recherche globale
    if (name) {
      whereConditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${name}%` } },
          { reference: { [Op.like]: `%${name}%` } },
          { compatible_references: { [Op.like]: `%${name}%` } }
        ]
      });
    }

    // Filtre catégorie
    if (category) {
      whereConditions.push({
        category: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('category')),
          'LIKE',
          `%${category.toLowerCase()}%`
        )
      });
    }

    // Filtre marque
    if (brand) {
      whereConditions.push({
        brand: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('brand')),
          'LIKE',
          `%${brand.toLowerCase()}%`
        )
      });
    }

    // Filtre stock
    if (minStock || maxStock) {
      const stockCond = {};
      if (minStock) stockCond[Op.gte] = Number(minStock);
      if (maxStock) stockCond[Op.lte] = Number(maxStock);
      whereConditions.push({ quantity_in_stock: stockCond });
    }

    const products = await Product.findAll({
      where: whereConditions.length ? { [Op.and]: whereConditions } : {}
    });

    res.json(products);

  } catch (err) {
    console.error('FILTER ERROR:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product || !product.is_active) return res.status(404).json({ error: 'Produit non trouvé' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Update produit
    await product.update(req.body);

    // 🔔 Gestion intelligente des alertes
    if (
      req.body.quantity_in_stock !== undefined &&
      product.quantity_in_stock >= product.threshold
    ) {
      await StockAlert.update(
        {
          resolved: true,
          resolved_at: new Date()
        },
        {
          where: {
            productId: product.id,
            resolved: false
          }
        }
      );
    }
    else {
      await StockAlert.findOrCreate({
        where: {
          productId: product.id,
          resolved: false
        },
        defaults: {
          type: req.body.quantity_in_stock <= 0 ? 'out_of_stock' : 'low_stock',
          message: `Stock faible: ${product.name} (${req.body.quantity_in_stock})`
        }
      });
    }
    res.json({
      message: 'Produit mis à jour',
      product
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// Delete product (soft delete)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit non trouvé' });
    await product.update({ is_active: false });
    res.json({ message: 'Produit désactivé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// -------------------- ROUTES CLIENTS --------------------

// All customers
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.findAll({  order: [['createdAt', 'DESC']] });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get customer by ID
app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer ) return res.status(404).json({ error: 'Client non trouvé' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create customer
app.post('/api/customers', async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update customer
app.put('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Client non trouvé' });
    await customer.update(req.body);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Soft delete
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Client non trouvé' });
    await customer.update({ is_active: false });
    res.json({ message: 'Client désactivé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- ROUTES FACTURES --------------------

// Get all invoices with filters
app.get('/api/invoices', async (req, res) => {
  const { type, status, customerId, minTotal, maxTotal, dateFrom, dateTo } = req.query;
  const filters = {};

  if (type) filters.type = type;
  if (status) filters.status = status;
  if (customerId) filters.customerId = customerId;
  if (minTotal) filters.total = { [Op.gte]: parseFloat(minTotal) };
  if (maxTotal) filters.total = { [Op.lte]: parseFloat(maxTotal) };
  if (dateFrom) filters.date = { [Op.gte]: new Date(dateFrom) };
  if (dateTo) filters.date = { ...filters.date, [Op.lte]: new Date(dateTo) };

  try {
    const invoices = await Invoice.findAll({
      where: filters,
      include: [{ model: Customer }],
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Customer },
        { model: InvoiceItem, include: [Product] }
      ]
    });
    if (!invoice) return res.status(404).json({ error: 'Facture non trouvée' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Create invoice
app.post('/api/invoices', async (req, res) => {
  try {
    const { customerId, type, items, due_date, notes } = req.body;

    // 1️⃣ Calculate total
    let total = 0;
    items.forEach(i => {
      total += i.quantity * i.unit_price;
    });

    // 2️⃣ Create invoice FIRST (no reference yet)
    const invoice = await Invoice.create({
      customerId,
      type,
      due_date,
      notes,
      total,
      status: type === 'quote' ? 'nostatus' : 'pending'
    });

    // 3️⃣ Generate reference AFTER ID exists
    const year = new Date().getFullYear();
    const prefix = type === 'invoice' ? 'FAC' : 'DEV';

    const reference = `${prefix}-${year}-${invoice.id
      .toString()
      .padStart(4, '0')}`;

    await invoice.update({ reference });

    // 4️⃣ Create items + handle stock
    for (const i of items) {
      await InvoiceItem.create({
        invoiceId: invoice.id,
        productId: i.productId,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price
      });

      // 📦 Stock management ONLY for invoices
      if (type === 'invoice') {
        const product = await Product.findByPk(i.productId);

        if (product) {
          const newQty = product.quantity_in_stock - i.quantity;
          await product.update({ quantity_in_stock: newQty });

          // 🔔 Stock alerts
          if (newQty < product.threshold) {
            await StockAlert.create({
              productId: product.id,
              type: newQty <= 0 ? 'out_of_stock' : 'low_stock',
              message: `Stock faible: ${product.name} (${newQty})`,
              resolved: false
            });
          }
        }
      }
    }

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Facture non trouvée' });
    await InvoiceItem.destroy({ where: { invoiceId: invoice.id } });
    await invoice.destroy();
    res.json({ message: 'Facture supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }});
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await StockAlert.findAll({
      include: [{ model: Product }],
      order: [['createdAt', 'DESC']]
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/alerts/unresolvedAlerts', async (req, res) => {
  try {
    const alerts = await StockAlert.findAll({
      where: {
        resolved: 0
      },
      include: [
        {
          model: Product,
          attributes: [
            'id',
            'name',
            'reference',
            'quantity_in_stock',
            'threshold'
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      count: alerts.length,
      alerts
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- PAYMENTS --------------------
app.post('/api/payments', async (req, res) => {
  try {
    const { invoiceId, amount, method } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Facture introuvable' });
    }

    if (invoice.type !== 'invoice') {
      return res.status(400).json({ error: 'Paiement interdit sur un devis' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Facture déjà payée' });
    }

    const payment = await Payment.create({ invoiceId, amount, method });

    const totalPaid = await Payment.sum('amount', { where: { invoiceId } });

    if (totalPaid >= invoice.total) {
      await invoice.update({ status: 'paid' });
    }

    res.json({
      message: 'Paiement enregistré',
      payment,
      totalPaid
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//PDF Generation for Invoice
// -------------------- CUSTOMER HISTORY ROUTES --------------------

// Get single customer with details
app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer || !customer.is_active) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    res.json(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all invoices for a specific customer
app.get('/api/invoices/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Validate customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer || !customer.is_active) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const invoices = await Invoice.findAll({
      where: { customerId },
      include: [
        { model: Customer },
        { model: InvoiceItem, include: [Product] }
      ],
      order: [['date', 'DESC']]
    });
    
    res.json(invoices || []);
  } catch (err) {
    console.error('Error fetching customer invoices:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all payments (with filters for customer)
app.get('/api/payments', async (req, res) => {
  try {
    const { customerId, method, dateFrom, dateTo, minAmount, maxAmount } = req.query;
    
    // Build filter conditions
    const whereConditions = {};
    
    // Customer filter (applied through invoice association)
    if (customerId) {
      // We'll filter after including invoices
    }
    
    // Payment method filter
    if (method) {
      whereConditions.method = method;
    }
    
    // Date range filters
    if (dateFrom || dateTo) {
      whereConditions.payment_date = {};
      if (dateFrom) whereConditions.payment_date[Op.gte] = new Date(dateFrom);
      if (dateTo) whereConditions.payment_date[Op.lte] = new Date(dateTo + 'T23:59:59');
    }
    
    // Amount filters
    if (minAmount || maxAmount) {
      whereConditions.amount = {};
      if (minAmount) whereConditions.amount[Op.gte] = parseFloat(minAmount);
      if (maxAmount) whereConditions.amount[Op.lte] = parseFloat(maxAmount);
    }

    // Fetch payments with invoice and customer data
    let payments = await Payment.findAll({
      where: whereConditions,
      include: [{
        model: Invoice,
        include: [Customer]
      }],
      order: [['payment_date', 'DESC']]
    });

    // Filter by customer if specified
    if (customerId) {
      payments = payments.filter(payment => 
        payment.Invoice && payment.Invoice.customerId == customerId
      );
    }

    res.json(payments);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Optional: Get payments by invoice
app.get('/api/payments/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const payments = await Payment.findAll({
      where: { invoiceId },
      include: [{
        model: Invoice,
        include: [Customer]
      }],
      order: [['payment_date', 'DESC']]
    });
    
    res.json(payments || []);
  } catch (err) {
    console.error('Error fetching invoice payments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Optional: Get customer stats summary
app.get('/api/customers/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate customer exists
    const customer = await Customer.findByPk(id);
    if (!customer || !customer.is_active) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // Get all customer invoices
    const invoices = await Invoice.findAll({
      where: { customerId: id },
      include: [Payment]
    });

    // Get all payments for this customer
    const payments = await Payment.findAll({
      include: [{
        model: Invoice,
        where: { customerId: id }
      }]
    });

    // Calculate stats
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = totalAmount - totalPaid;

    // Get last invoice
    const lastInvoice = invoices.length > 0 
      ? [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      : null;

    // Get last payment
    const lastPayment = payments.length > 0
      ? [...payments].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0]
      : null;

    // Group by invoice type
    const byType = invoices.reduce((acc, inv) => {
      acc[inv.type] = (acc[inv.type] || 0) + 1;
      return acc;
    }, {});

    // Group by invoice status
    const byStatus = invoices.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});

    // Group payments by method
    const byMethod = payments.reduce((acc, payment) => {
      acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
      return acc;
    }, {});

    res.json({
      customer,
      stats: {
        totalInvoices,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        totalPending: parseFloat(totalPending.toFixed(2)),
        lastInvoice: lastInvoice ? {
          id: lastInvoice.id,
          type: lastInvoice.type,
          total: lastInvoice.total,
          date: lastInvoice.date
        } : null,
        lastPayment: lastPayment ? {
          id: lastPayment.id,
          amount: lastPayment.amount,
          method: lastPayment.method,
          date: lastPayment.payment_date
        } : null,
        byType,
        byStatus,
        byMethod
      }
    });

  } catch (err) {
    console.error('Error fetching customer stats:', err);
    res.status(500).json({ error: err.message });
  }
});
// Update a payment
app.put('/api/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, payment_date, notes } = req.body;

    console.log(`Updating payment ID: ${id} with data:`, req.body);

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    // Check if payment exists
    const existingPayment = await Payment.findByPk(id, {
      include: [{
        model: Invoice,
        include: [Customer]
      }]
    });

    if (!existingPayment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    // Update payment
    const updatedPayment = await existingPayment.update({
      amount: parseFloat(amount),
      method: method || existingPayment.method,
      payment_date: payment_date || existingPayment.payment_date,
      notes: notes || existingPayment.notes
    });

    // Recalculate invoice status after payment update
    await updateInvoiceStatus(existingPayment.invoiceId);

    // Fetch updated payment with associations
    const paymentWithAssociations = await Payment.findByPk(id, {
      include: [{
        model: Invoice,
        include: [Customer]
      }]
    });

    console.log('Payment updated successfully:', paymentWithAssociations.id);
    res.json(paymentWithAssociations);

  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a payment
app.delete('/api/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting payment ID: ${id}`);

    // Check if payment exists
    const payment = await Payment.findByPk(id, {
      include: [Invoice]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    const invoiceId = payment.invoiceId;
    
    // Delete the payment
    await payment.destroy();
    console.log('Payment deleted successfully:', id);

    // Recalculate invoice status after payment deletion
    await updateInvoiceStatus(invoiceId);

    res.json({ 
      message: 'Paiement supprimé avec succès',
      deleted: true 
    });

  } catch (err) {
    console.error('Error deleting payment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to update invoice status based on payments
async function updateInvoiceStatus(invoiceId) {
  try {
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [Payment]
    });

    if (!invoice) {
      console.log('Invoice not found for status update:', invoiceId);
      return;
    }

    // Calculate total paid
    const totalPaid = invoice.Payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = invoice.total - totalPaid;

    let newStatus = invoice.status;
    
    if (remaining <= 0) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'pending';
    } else {
      newStatus = 'pending';
    }

    // Only update if status changed
    if (newStatus !== invoice.status) {
      await invoice.update({ status: newStatus });
      console.log(`Invoice ${invoiceId} status updated to: ${newStatus}`);
    }

  } catch (err) {
    console.error('Error updating invoice status:', err);
  }
}

// Get payments for specific invoice
app.get('/api/payments/invoice/:invoiceId', async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { invoiceId: req.params.invoiceId },
      order: [['createdAt', 'DESC']]
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single payment
app.get('/api/payments/:id', async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [Invoice]
    });
    if (!payment) {
      return res.status(404).json({ error: 'Paiement introuvable' });
    }
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Customer },
        { model: InvoiceItem, include: [Product] }
      ]
    });

    if (!invoice) return res.status(404).send('Invoice not found');

    // Prepare products
    const products = invoice.InvoiceItems.map(item => ({
      name: item.Product.name,
      ref: item.Product.reference,
      qty: item.quantity,
      unit_price: item.unit_price.toFixed(2),
      total: (item.quantity * item.unit_price).toFixed(2)
    }));

    const totalHT = products.reduce((acc, p) => acc + parseFloat(p.total), 0);
    const tva = totalHT * 0.19;
    const totalTTC = totalHT + tva;


    // Render HTML template
  
    const templatePath = path.join(__dirname, 'templates', 'invoice_template.html');
    const html = await ejs.renderFile(templatePath, {
      invoice,
      products,
      totalHT: totalHT.toFixed(2),
      tva: tva.toFixed(2),
      totalTTC: totalTTC.toFixed(2),
      invoice_number: `FAC-2026-${invoice.id.toString().padStart(3, '0')}`,
      invoice_date: invoice.date.toISOString().split('T')[0]
    });

    // Launch Puppeteer
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Set content and wait for CSS/fonts/images to load
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await browser.close();

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${invoice.id}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

    console.log('PDF generated and sent successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});



app.get('/test-pdf', async (req, res) => {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText('Hello World!', {
      x: 50,
      y: height - 50,
      size: 24,
      font,
      color: rgb(0, 0, 1)
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=test.pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// -------------------- LANCER SERVEUR -------------------- 

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on port ${PORT}`);
});