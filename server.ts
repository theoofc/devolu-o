import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  const DATA_DIR = path.join(process.cwd(), "data");
  const DATA_FILE = path.join(DATA_DIR, "returns.json");
  const DELETED_DATA_FILE = path.join(DATA_DIR, "deleted_returns.json");
  const USERS_FILE = path.join(DATA_DIR, "users.json");
  const REQUISITIONS_FILE = path.join(DATA_DIR, "requisitions.json");

  // Ensure data directory and files exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(DELETED_DATA_FILE)) {
    fs.writeFileSync(DELETED_DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(REQUISITIONS_FILE)) {
    fs.writeFileSync(REQUISITIONS_FILE, JSON.stringify([], null, 2), "utf-8");
  }

  // Seed default users if users.json doesn't exist
  const DEFAULT_USERS = [
    {
      id: "usr_gustavo",
      username: "Gustavo",
      password: "Maximo123",
      name: "Gustavo",
      role: "admin"
    },
    {
      id: "usr_felipe",
      username: "felipe",
      password: "felipe123",
      name: "Felipe",
      role: "felipe"
    },
    {
      id: "usr_fernanda",
      username: "Fernanda",
      password: "Fernanda123",
      name: "Fernanda",
      role: "fernanda"
    },
    {
      id: "usr_administrativo",
      username: "Administrativo",
      password: "ADM123",
      name: "Administrativo",
      role: "administrativo"
    }
  ];

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), "utf-8");
  }

  // Increase payload limits for base64 image uploads (3 photos minimum)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper to write returns (atomic write)
  function writeReturns(data: any) {
    try {
      const tmpFile = DATA_FILE + ".tmp";
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tmpFile, DATA_FILE);
    } catch (err) {
      console.error("Erro ao salvar no banco de dados local:", err);
    }
  }

  // Helper to read returns (with corrupt JSON auto-recovery)
  function readReturns() {
    try {
      if (!fs.existsSync(DATA_FILE)) {
        return [];
      }
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      if (!data.trim()) return [];
      const returns = JSON.parse(data);
      return Array.isArray(returns) ? returns : [];
    } catch (err) {
      console.warn("Aviso: arquivo de devoluções corrompido. Recuperando arquivo limpo...", err);
      try {
        if (fs.existsSync(DATA_FILE)) {
          fs.renameSync(DATA_FILE, `${DATA_FILE}.corrupt.${Date.now()}.bak`);
        }
        writeReturns([]);
      } catch (backupErr) {
        console.error("Erro ao isolar arquivo corrompido:", backupErr);
      }
      return [];
    }
  }

  // Helper to write deleted returns (atomic write)
  function writeDeletedReturns(data: any) {
    try {
      const tmpFile = DELETED_DATA_FILE + ".tmp";
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tmpFile, DELETED_DATA_FILE);
    } catch (err) {
      console.error("Erro ao salvar na lixeira:", err);
    }
  }

  // Helper to read deleted returns (with corrupt JSON auto-recovery)
  function readDeletedReturns() {
    try {
      if (!fs.existsSync(DELETED_DATA_FILE)) {
        return [];
      }
      const data = fs.readFileSync(DELETED_DATA_FILE, "utf-8");
      if (!data.trim()) return [];
      const returns = JSON.parse(data);
      return Array.isArray(returns) ? returns : [];
    } catch (err) {
      console.warn("Aviso: lixeira de devoluções corrompida. Recuperando arquivo limpo...", err);
      try {
        if (fs.existsSync(DELETED_DATA_FILE)) {
          fs.renameSync(DELETED_DATA_FILE, `${DELETED_DATA_FILE}.corrupt.${Date.now()}.bak`);
        }
        writeDeletedReturns([]);
      } catch (backupErr) {
        console.error("Erro ao isolar lixeira corrompida:", backupErr);
      }
      return [];
    }
  }

  // Helper to read users
  function readUsers() {
    try {
      if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), "utf-8");
        return DEFAULT_USERS;
      }
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      if (!data.trim()) return DEFAULT_USERS;
      const users = JSON.parse(data);
      return Array.isArray(users) && users.length > 0 ? users : DEFAULT_USERS;
    } catch (err) {
      console.error("Erro ao ler usuários:", err);
      return DEFAULT_USERS;
    }
  }

  // Helper to write users
  function writeUsers(data: any) {
    try {
      const tmpFile = USERS_FILE + ".tmp";
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tmpFile, USERS_FILE);
    } catch (err) {
      console.error("Erro ao salvar usuários:", err);
    }
  }

  // Helper to read requisitions
  function readRequisitions() {
    try {
      if (!fs.existsSync(REQUISITIONS_FILE)) {
        return [];
      }
      const data = fs.readFileSync(REQUISITIONS_FILE, "utf-8");
      if (!data.trim()) return [];
      const requisitions = JSON.parse(data);
      return Array.isArray(requisitions) ? requisitions : [];
    } catch (err) {
      console.error("Erro ao ler requisições:", err);
      return [];
    }
  }

  // Helper to write requisitions
  function writeRequisitions(data: any) {
    try {
      const tmpFile = REQUISITIONS_FILE + ".tmp";
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tmpFile, REQUISITIONS_FILE);
    } catch (err) {
      console.error("Erro ao salvar requisições:", err);
    }
  }

  // API Routes

  // Auth: Login Endpoint
  app.post("/api/login", (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
      }

      const users = readUsers();
      const user = users.find(
        (u: any) =>
          u.username.toLowerCase().trim() === String(username).toLowerCase().trim() &&
          u.password === String(password)
      );

      if (!user) {
        return res.status(401).json({ error: "Usuário ou senha incorretos." });
      }

      const { password: _, ...userWithoutPassword } = user;
      return res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error("Erro no login:", error);
      return res.status(500).json({ error: "Erro interno no servidor de autenticação." });
    }
  });

  // Users Management Endpoints
  app.get("/api/users", (req, res) => {
    const users = readUsers().map(({ password, ...rest }: any) => rest);
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    try {
      const { username, password, name, role } = req.body;
      if (!username || !password || !name || !role) {
        return res.status(400).json({ error: "Todos os campos do usuário são obrigatórios." });
      }

      const users = readUsers();
      if (users.some((u: any) => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ error: "Nome de usuário já existente." });
      }

      const newUser = {
        id: "usr_" + Date.now().toString().slice(-6),
        username: username.trim(),
        password: password.trim(),
        name: name.trim(),
        role: role.trim()
      };

      users.push(newUser);
      writeUsers(users);

      const { password: _, ...createdUser } = newUser;
      res.json({ message: "Usuário criado com sucesso.", user: createdUser });
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ error: "Erro ao criar usuário." });
    }
  });

  // Requisitions Endpoints
  app.get("/api/requisitions", (req, res) => {
    const requisitions = readRequisitions();
    res.json(requisitions);
  });

  app.post("/api/requisitions", (req, res) => {
    try {
      const { returnId, itemCode, clientName, createdBy, message } = req.body;
      if (!returnId || !message || !createdBy) {
        return res.status(400).json({ error: "Informações incompletas para criar a requisição." });
      }

      const requisitions = readRequisitions();
      const newRequisition = {
        id: "REQ-" + Date.now().toString().slice(-6),
        returnId,
        itemCode: itemCode || "N/A",
        clientName: clientName || "N/A",
        createdBy,
        createdAt: new Date().toISOString(),
        message: message.trim(),
        status: "Pendente"
      };

      requisitions.unshift(newRequisition);
      writeRequisitions(requisitions);

      res.json({ message: "Requisição enviada com sucesso.", requisition: newRequisition });
    } catch (error) {
      console.error("Erro ao criar requisição:", error);
      res.status(500).json({ error: "Erro ao salvar requisição." });
    }
  });

  app.post("/api/requisitions/:id/answer", (req, res) => {
    try {
      const { id } = req.params;
      const { answer, answeredBy } = req.body;

      if (!answer || !answer.trim()) {
        return res.status(400).json({ error: "A resposta não pode estar vazia." });
      }

      const requisitions = readRequisitions();
      const index = requisitions.findIndex((r: any) => r.id === id);

      if (index === -1) {
        return res.status(404).json({ error: "Requisição não encontrada." });
      }

      requisitions[index] = {
        ...requisitions[index],
        status: "Respondida",
        answer: answer.trim(),
        answeredBy: answeredBy || "Gustavo",
        answeredAt: new Date().toISOString()
      };

      writeRequisitions(requisitions);

      res.json({ message: "Resposta enviada com sucesso.", requisition: requisitions[index] });
    } catch (error) {
      console.error("Erro ao responder requisição:", error);
      res.status(500).json({ error: "Erro ao salvar resposta da requisição." });
    }
  });

  // 1. Get Returns List
  app.get("/api/returns", (req, res) => {
    const returns = readReturns();
    res.json(returns);
  });

  // 2. Clear / Reset Returns List
  app.post("/api/returns/reset", (req, res) => {
    writeReturns([]);
    res.json({ message: "Banco de dados de devoluções resetado com sucesso." });
  });

  // 3. Register a Return (Simple, fast registration without AI)
  app.post("/api/returns", async (req, res) => {
    try {
      const {
        itemCode,
        clientName,
        isSealed,
        causeDescription,
        images, // Array of base64 image strings
        supplierCode,
        productName,
        quantity,
      } = req.body;

      // Enforce requirements
      if (!itemCode && !clientName) {
        return res.status(400).json({
          error: "É necessário fornecer o código do item ou o nome do cliente.",
        });
      }

      if (!images || images.length < 3) {
        return res.status(400).json({
          error: "É necessário anexar pelo menos 3 fotos para registrar a devolução.",
        });
      }

      // Save returns logs
      const returns = readReturns();
      const newReturn = {
        id: "DEV-" + Date.now().toString().slice(-6),
        itemCode: itemCode || "N/A",
        clientName: clientName || "N/A",
        isSealed,
        causeDescription: causeDescription || "",
        images: images || [], // Persist the base64 images so they display in history
        createdAt: new Date().toISOString(),
        supplierCode: supplierCode || "",
        productName: productName || "",
        quantity: typeof quantity === "number" ? quantity : (Number(quantity) || 1),
      };

      returns.unshift(newReturn); // Put newest first
      writeReturns(returns);

      res.status(201).json(newReturn);
    } catch (error) {
      console.error("Erro geral ao registrar devolução:", error);
      res.status(500).json({
        error: "Ocorreu um erro interno no servidor ao registrar a devolução.",
      });
    }
  });

  // 4. Update / Edit a Return
  app.put("/api/returns/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { itemCode, clientName, isSealed, causeDescription, images, supplierCode, productName, quantity } = req.body;

      const returns = readReturns();
      const returnIndex = returns.findIndex((r: any) => r.id === id);

      if (returnIndex === -1) {
        return res.status(404).json({ error: "Devolução não encontrada." });
      }

      // Validation
      if (!itemCode && !clientName) {
        return res.status(400).json({
          error: "É necessário fornecer o código do item ou o nome do cliente.",
        });
      }

      if (images && images.length < 3) {
        return res.status(400).json({
          error: "É necessário manter pelo menos 3 fotos na vistoria.",
        });
      }

      // Keep previous images if not supplied
      const updatedImages = images !== undefined ? images : returns[returnIndex].images;

      returns[returnIndex] = {
        ...returns[returnIndex],
        itemCode: itemCode !== undefined ? itemCode : returns[returnIndex].itemCode,
        clientName: clientName !== undefined ? clientName : returns[returnIndex].clientName,
        isSealed: isSealed !== undefined ? isSealed : returns[returnIndex].isSealed,
        causeDescription: causeDescription !== undefined ? causeDescription : returns[returnIndex].causeDescription,
        images: updatedImages,
        supplierCode: supplierCode !== undefined ? supplierCode : (returns[returnIndex].supplierCode || ""),
        productName: productName !== undefined ? productName : (returns[returnIndex].productName || ""),
        quantity: quantity !== undefined ? Number(quantity) : (returns[returnIndex].quantity || 1),
      };

      writeReturns(returns);
      res.json(returns[returnIndex]);
    } catch (error) {
      console.error("Erro ao atualizar devolução:", error);
      res.status(500).json({ error: "Erro ao atualizar a devolução no servidor." });
    }
  });

  // 5. Delete a Return (Moves to Deleted Items / Lixeira)
  app.delete("/api/returns/:id", (req, res) => {
    try {
      const { id } = req.params;
      const targetId = String(id).trim().toLowerCase();
      const returns = readReturns();
      
      const itemToDelete = returns.find((r: any) => String(r.id).trim().toLowerCase() === targetId);

      if (!itemToDelete) {
        return res.status(404).json({ error: "Devolução não encontrada para exclusão." });
      }

      const updatedReturns = returns.filter((r: any) => String(r.id).trim().toLowerCase() !== targetId);
      writeReturns(updatedReturns);

      // Add to deleted_returns.json
      const deletedReturns = readDeletedReturns();
      const deletedItem = {
        ...itemToDelete,
        deletedAt: new Date().toISOString()
      };
      deletedReturns.unshift(deletedItem);
      writeDeletedReturns(deletedReturns);

      console.log(`[Devoluções Server] Devolução ${id} movida para a lixeira/excluídos.`);
      res.json({ message: "Devolução movida para os excluídos com sucesso.", id, deletedItem });
    } catch (error) {
      console.error("Erro ao excluir devolução:", error);
      res.status(500).json({ error: "Erro ao excluir a devolução no servidor." });
    }
  });

  // 6. Get Deleted Returns List (Lixeira / Área de Excluídos)
  app.get("/api/deleted-returns", (req, res) => {
    const deleted = readDeletedReturns();
    res.json(deleted);
  });

  // 7. Restore a Deleted Return
  app.post("/api/deleted-returns/:id/restore", (req, res) => {
    try {
      const { id } = req.params;
      const targetId = String(id).trim().toLowerCase();
      const deletedReturns = readDeletedReturns();

      const itemToRestore = deletedReturns.find((r: any) => String(r.id).trim().toLowerCase() === targetId);

      if (!itemToRestore) {
        return res.status(404).json({ error: "Item excluído não encontrado para restauração." });
      }

      // Remove from deleted_returns
      const updatedDeleted = deletedReturns.filter((r: any) => String(r.id).trim().toLowerCase() !== targetId);
      writeDeletedReturns(updatedDeleted);

      // Clean deletedAt property and push back to active returns
      const { deletedAt, ...restoredItem } = itemToRestore;
      const returns = readReturns();
      returns.unshift(restoredItem);
      writeReturns(returns);

      console.log(`[Devoluções Server] Devolução ${id} restaurada com sucesso.`);
      res.json({ message: "Devolução restaurada com sucesso.", item: restoredItem });
    } catch (error) {
      console.error("Erro ao restaurar devolução:", error);
      res.status(500).json({ error: "Erro ao restaurar a devolução no servidor." });
    }
  });

  // 8. Permanently Delete an Item from Trash
  app.delete("/api/deleted-returns/:id", (req, res) => {
    try {
      const { id } = req.params;
      const targetId = String(id).trim().toLowerCase();
      const deletedReturns = readDeletedReturns();

      const updatedDeleted = deletedReturns.filter((r: any) => String(r.id).trim().toLowerCase() !== targetId);

      if (deletedReturns.length === updatedDeleted.length) {
        return res.status(404).json({ error: "Item não encontrado na lixeira." });
      }

      writeDeletedReturns(updatedDeleted);
      res.json({ message: "Item excluído permanentemente.", id });
    } catch (error) {
      console.error("Erro ao purgar item:", error);
      res.status(500).json({ error: "Erro ao excluir permanentemente o item." });
    }
  });

  // 9. Purge All Items from Trash (Esvaziar Lixeira)
  app.post("/api/deleted-returns/purge", (req, res) => {
    try {
      writeDeletedReturns([]);
      res.json({ message: "Lixeira esvaziada com sucesso." });
    } catch (error) {
      console.error("Erro ao esvaziar lixeira:", error);
      res.status(500).json({ error: "Erro ao esvaziar a lixeira." });
    }
  });

  // Vite Middleware for development / Static file serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Devoluções Server] Servidor ativo em http://localhost:${PORT}`);
  });
}

startServer();
