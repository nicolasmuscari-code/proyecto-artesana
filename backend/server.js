// ============================================
// SERVIDOR BACKEND DE ARTESANA
// ============================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURACIÓN DE POSTGRESQL
// ============================================

// Si existe DATABASE_URL, usamos Neon.
// Si no existe, usamos la base de datos local.
const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: true
        }
    })
    : new Pool({
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "artesana",
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT || 5432)
    });

// ============================================
// MIDDLEWARE PARA VERIFICAR EL TOKEN JWT
// ============================================

function verificarToken(req, res, next) {
    const encabezado = req.headers.authorization;

    if (!encabezado || !encabezado.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Debés iniciar sesión para realizar esta operación."
        });
    }

    const token = encabezado.slice("Bearer ".length);

    if (!process.env.JWT_SECRET) {
        console.error("Falta configurar JWT_SECRET en .env");

        return res.status(500).json({
            error: "Error de configuración del servidor."
        });
    }

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(401).json({
            error: "La sesión no es válida o ha vencido. Iniciá sesión nuevamente."
        });
    }
}

// ============================================
// COMPROBAR LA CONEXIÓN CON POSTGRESQL
// ============================================

pool.query("SELECT NOW()", (error, resultado) => {
    if (error) {
        console.error(
            "Error al conectar con PostgreSQL:",
            error
        );
        return;
    }

    console.log("Conexión con PostgreSQL exitosa");
    console.log(
        "Fecha y hora de PostgreSQL:",
        resultado.rows[0].now
    );
});

const PORT = Number(process.env.PORT || 3000);

// ============================================
// RUTAS DE PRUEBA
// ============================================

app.get("/", (req, res) => {
    res.send("Servidor de Artesana funcionando correctamente");
});

app.get("/api", (req, res) => {
    res.json({
        mensaje: "API de Artesana funcionando correctamente"
    });
});

// ============================================
// INICIAR SESIÓN Y GENERAR TOKEN JWT
// ============================================

app.post("/login", async (req, res) => {
    const { email, password } = req.body || {};

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            error: "Completá el email y la contraseña."
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error("Falta configurar JWT_SECRET en .env");

        return res.status(500).json({
            error: "Error de configuración del servidor."
        });
    }

    try {
        const resultado = await pool.query(
            `SELECT id, nombre, apellido, email, password
             FROM usuarios
             WHERE LOWER(email) = LOWER($1)`,
            [email.trim()]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                error: "El email o la contraseña son incorrectos."
            });
        }

        const usuario = resultado.rows[0];
        const claveGuardada = usuario.password;
        let contrasenaValida = false;

        // Verificamos la contraseña exclusivamente con bcrypt.
        if (typeof claveGuardada === "string") {
            contrasenaValida = await bcrypt.compare(
                password,
                claveGuardada
            );
        }

        if (!contrasenaValida) {
            return res.status(401).json({
                error: "El email o la contraseña son incorrectos."
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        return res.status(200).json({
            mensaje: "Inicio de sesión exitoso.",
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error(
            "Error al iniciar sesión:",
            error.message
        );

        return res.status(500).json({
            error: "No se pudo iniciar sesión."
        });
    }
});

// ============================================
// CONSULTAR USUARIOS
// RUTA DESHABILITADA POR SEGURIDAD
// ============================================

app.get("/usuarios", (req, res) => {
    return res.status(403).json({
        error: "No está permitido consultar la lista de usuarios."
    });
});

// ============================================
// REGISTRAR UN NUEVO USUARIO
// ============================================

app.post("/usuarios", async (req, res) => {
    const { nombre, apellido, email, password } = req.body || {};

    if (
        typeof nombre !== "string" || !nombre.trim() ||
        typeof apellido !== "string" || !apellido.trim() ||
        typeof email !== "string" || !email.trim() ||
        typeof password !== "string" || !password
    ) {
        return res.status(400).json({
            error: "Completá nombre, apellido, email y contraseña."
        });
    }

    try {
        // Guardamos un hash, nunca la contraseña original.
        const hash = await bcrypt.hash(password, 10);

        const resultado = await pool.query(
            `INSERT INTO usuarios
                (nombre, apellido, email, password)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nombre, apellido, email`,
            [
                nombre.trim(),
                apellido.trim(),
                email.trim().toLowerCase(),
                hash
            ]
        );

        return res.status(201).json({
            mensaje: "Usuario creado correctamente.",
            usuario: resultado.rows[0]
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                error: "Ya existe un usuario registrado con ese email."
            });
        }

        console.error(
            "Error al crear usuario:",
            error.message
        );

        return res.status(500).json({
            error: "Error al crear el usuario."
        });
    }
});

// ============================================
// REGISTRAR UN PEDIDO
// ============================================

app.post("/pedidos", verificarToken, async (req, res) => {
    const { productos } = req.body || {};

    if (!Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({
            error: "El pedido debe contener al menos un producto."
        });
    }

    // Validamos los identificadores y las cantidades.
    const productosValidos = productos.every((producto) => (
        producto &&
        Number.isSafeInteger(Number(producto.id)) &&
        Number(producto.id) > 0 &&
        Number.isSafeInteger(Number(producto.cantidad)) &&
        Number(producto.cantidad) > 0
    ));

    if (!productosValidos) {
        return res.status(400).json({
            error: "Los productos o las cantidades no son válidos."
        });
    }

    // Agrupamos productos repetidos sumando sus cantidades.
    const productosAgrupados = new Map();

    for (const producto of productos) {
        const id = Number(producto.id);
        const cantidad = Number(producto.cantidad);

        const cantidadAcumulada =
            (productosAgrupados.get(id) || 0) + cantidad;

        if (!Number.isSafeInteger(cantidadAcumulada)) {
            return res.status(400).json({
                error: "La cantidad de un producto es demasiado grande."
            });
        }

        productosAgrupados.set(id, cantidadAcumulada);
    }

    const productosUnicos = Array.from(
        productosAgrupados,
        ([id, cantidad]) => ({ id, cantidad })
    );

    let conexion;

    try {
        // Usamos una transacción para registrar el pedido completo.
        conexion = await pool.connect();
        await conexion.query("BEGIN");

        const idsProductos = productosUnicos.map(
            (producto) => producto.id
        );

        const resultadoProductos = await conexion.query(
            `SELECT id, nombre, precio
             FROM productos
             WHERE id = ANY($1::integer[])`,
            [idsProductos]
        );

        const productosBD = new Map();

        resultadoProductos.rows.forEach((producto) => {
            productosBD.set(Number(producto.id), producto);
        });

        let total = 0;
        const detalles = [];

        for (const productoCarrito of productosUnicos) {
            const idProducto = productoCarrito.id;
            const cantidad = productoCarrito.cantidad;
            const productoBD = productosBD.get(idProducto);

            if (!productoBD) {
                const error = new Error(
                    `El producto con ID ${idProducto} no existe.`
                );

                error.status = 400;
                throw error;
            }

            // Usamos el precio real guardado en PostgreSQL.
            const precioUnitario = Number(productoBD.precio);
            const subtotal = precioUnitario * cantidad;

            if (
                !Number.isFinite(precioUnitario) ||
                precioUnitario < 0 ||
                !Number.isFinite(subtotal) ||
                !Number.isFinite(total + subtotal)
            ) {
                const error = new Error(
                    "El total del pedido no es válido."
                );

                error.status = 400;
                throw error;
            }

            total += subtotal;

            detalles.push({
                producto_id: idProducto,
                cantidad,
                precio_unitario: precioUnitario
            });
        }

        // Registramos el pedido como pendiente.
        const resultadoPedido = await conexion.query(
            `INSERT INTO pedidos
                (usuario_id, estado, total)
             VALUES ($1, $2, $3)
             RETURNING id, usuario_id, fecha_pedido, estado, total`,
            [req.usuario.id, "pendiente", total]
        );

        const pedido = resultadoPedido.rows[0];

        // Registramos los productos asociados al pedido.
        for (const detalle of detalles) {
            await conexion.query(
                `INSERT INTO detalle_pedido
                    (pedido_id, producto_id, cantidad, precio_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [
                    pedido.id,
                    detalle.producto_id,
                    detalle.cantidad,
                    detalle.precio_unitario
                ]
            );
        }

        await conexion.query("COMMIT");

        return res.status(201).json({
            mensaje: "Pedido registrado correctamente.",
            pedido,
            detalles
        });

    } catch (error) {
        if (conexion) {
            try {
                await conexion.query("ROLLBACK");
            } catch (errorRollback) {
                console.error(
                    "Error al revertir la transacción:",
                    errorRollback.message
                );
            }
        }

        console.error(
            "Error al registrar el pedido:",
            error.message
        );

        const estadoHTTP = error.status || 500;

        return res.status(estadoHTTP).json({
            error: estadoHTTP === 400
                ? error.message
                : "No se pudo registrar el pedido."
        });

    } finally {
        if (conexion) {
            conexion.release();
        }
    }
});

// ============================================
// OBTENER TODOS LOS PRODUCTOS
// ============================================

app.get("/productos", async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM productos ORDER BY id"
        );

        return res.status(200).json(resultado.rows);

    } catch (error) {
        console.error(
            "Error al obtener productos:",
            error.message
        );

        return res.status(500).json({
            error: "Error al obtener los productos."
        });
    }
});

// ============================================
// INICIAR EL SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(
        `Servidor de Artesana funcionando en http://localhost:${PORT}`
    );
});