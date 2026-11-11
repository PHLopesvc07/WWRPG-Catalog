/**
 * PONTO DE ENTRADA PRINCIPAL — ARQUIVO GERAL DO MINISTÉRIO DA MAGIA (W&W RPG)
 * Inicializa os 4 Catálogos (Animais, Feitiços, Plantas e Poções).
 */

import { TabController } from "./controllers/TabController.js";
import { CreatureController } from "./controllers/CreatureController.js";
import { SpellController } from "./controllers/SpellController.js";
import { PlantController } from "./controllers/PlantController.js";
import { PotionController } from "./controllers/PotionController.js";
import { initDatabaseConnection } from "./services/database.js";

document.addEventListener("DOMContentLoaded", async () => {
    new TabController();
    new CreatureController();
    new SpellController();
    new PlantController();
    new PotionController();

    await initDatabaseConnection();
});
