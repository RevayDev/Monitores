import pool from '../backend/utils/mysql.helper.js';

async function populateStaticData() {
  try {
    console.log("Adding static data to static_data table...");
    
    // Clear out any old static data first to prevent duplicate pollution
    await pool.query("DELETE FROM static_data");

    // Requested data
    const sedes = ["Sede plaza la paz", "sede soledad", "sede centro historico", "sede posgrado"];
    const modalidades = ["Presencial", "Virtual", "Híbrido"];
    const cuatrimestres = Array.from({length: 15}, (_, i) => `${i + 1}° Cuatrimestre`);

    // Insert Sedes
    for (const sede of sedes) {
      await pool.query("INSERT INTO static_data (data_key, item_value) VALUES (?, ?)", ['sedes', sede]);
      console.log(`Inserted sede: ${sede}`);
    }

    // Insert Modalidades 
    for (const mod of modalidades) {
      await pool.query("INSERT INTO static_data (data_key, item_value) VALUES (?, ?)", ['modalidades', mod]);
      console.log(`Inserted modalidad: ${mod}`);
    }

    // Insert Cuatrimestres
    for (const cuat of cuatrimestres) {
      await pool.query("INSERT INTO static_data (data_key, item_value) VALUES (?, ?)", ['cuatrimestres', cuat]);
      console.log(`Inserted cuatrimestre: ${cuat}`);
    }

    console.log("Successfully populated static data!");
    process.exit(0);

  } catch (error) {
    console.error("Failed to populate static data:", error);
    process.exit(1);
  }
}

populateStaticData();
