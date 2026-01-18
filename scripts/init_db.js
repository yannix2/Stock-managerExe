const { sequelize } = require('../db/models');

async function initDB() {
    try {
        await sequelize.sync({ force: true }); // supprime les tables si existantes et recrée
        console.log("Toutes les tables ont été créées avec succès !");
        process.exit(0);
    } catch (err) {
        console.error("Erreur lors de la création des tables :", err);
    }
}

initDB();
