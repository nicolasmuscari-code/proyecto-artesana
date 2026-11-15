
// ============================================
// SERVIDOR BACKEND DE ARTESANA
// ============================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { Resend } = require("resend");

// Cliente para enviar correos electrónicos.
const resend = new Resend(process.env.RESEND_API_KEY);

// Cliente para verificar los tokens de Google.
const clienteGoogle = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
// INICIAR SESIÓN O REGISTRARSE CON GOOGLE
// ============================================

app.post("/auth/google", async (req, res) => {

    const { credential } = req.body || {};

    if (typeof credential !== "string" || !credential.trim()) {
        return res.status(400).json({
            error: "No se recibió la credencial de Google."
        });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
        console.error("Falta configurar GOOGLE_CLIENT_ID en .env");

        return res.status(500).json({
            error: "Error de configuración del inicio de sesión con Google."
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error("Falta configurar JWT_SECRET en .env");

        return res.status(500).json({
            error: "Error de configuración del servidor."
        });
    }

    try {

        // Verificamos la firma, vigencia y destinatario del token de Google.
        let datosGoogle;

        try {

            const ticket = await clienteGoogle.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            datosGoogle = ticket.getPayload();

        } catch (errorGoogle) {

            console.error(
                "No se pudo verificar el token de Google:",
                errorGoogle.message
            );

            return res.status(401).json({
                error: "La credencial de Google no es válida o venció."
            });

        }

        // Solo aceptamos cuentas con email verificado por Google.
        if (
            !datosGoogle ||
            !datosGoogle.email ||
            datosGoogle.email_verified !== true
        ) {
            return res.status(401).json({
                error: "No se pudo verificar el email de la cuenta de Google."
            });
        }

        const email = datosGoogle.email.trim().toLowerCase();

        const nombreCompleto = (datosGoogle.name || "").trim();
        const partesNombre = nombreCompleto.split(/\s+/).filter(Boolean);

        const nombre =
            datosGoogle.given_name || partesNombre[0] || "Usuario";

        const apellido =
            datosGoogle.family_name || partesNombre.slice(1).join(" ") || "Google";

        // Buscamos si ya existe una cuenta con ese email.
        let resultadoUsuario = await pool.query(
            `SELECT id, nombre, apellido, email
             FROM usuarios
             WHERE LOWER(email) = LOWER($1)`,
            [email]
        );

        let usuario;

        if (resultadoUsuario.rows.length > 0) {

            // El email verificado permite reconocer la cuenta existente.
            usuario = resultadoUsuario.rows[0];

        } else {

            // La columna password de la tabla actual no admite valores nulos.
            // Creamos un hash aleatorio que no se utiliza para iniciar sesión con Google.
            const claveAleatoria = crypto.randomBytes(32).toString("hex");

            const hashAleatorio = await bcrypt.hash(
                claveAleatoria,
                10
            );

            try {

                resultadoUsuario = await pool.query(
                    `INSERT INTO usuarios
                        (nombre, apellido, email, password)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id, nombre, apellido, email`,
                    [
                        nombre,
                        apellido,
                        email,
                        hashAleatorio
                    ]
                );

                usuario = resultadoUsuario.rows[0];

            } catch (errorInsertar) {

                // Si dos solicitudes crean la cuenta al mismo tiempo,
                // recuperamos la cuenta que se haya insertado primero.
                if (errorInsertar.code !== "23505") {
                    throw errorInsertar;
                }

                resultadoUsuario = await pool.query(
                    `SELECT id, nombre, apellido, email
                     FROM usuarios
                     WHERE LOWER(email) = LOWER($1)`,
                    [email]
                );

                if (resultadoUsuario.rows.length === 0) {
                    throw errorInsertar;
                }

                usuario = resultadoUsuario.rows[0];

            }

        }

        // Generamos el mismo tipo de JWT que utiliza el login tradicional.
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
            mensaje: "Inicio de sesión con Google exitoso.",
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
            "Error al procesar el inicio de sesión con Google:",
            error.message
        );

        return res.status(500).json({
            error: "No se pudo completar el inicio de sesión con Google."
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

        // Iniciamos una transacción para registrar el pedido completo.
        conexion = await pool.connect();

        await conexion.query("BEGIN");

        const idsProductos = productosUnicos.map(
            (producto) => producto.id
        );

        // Bloqueamos los productos durante la operación para evitar
        // que dos compras simultáneas utilicen el mismo stock.
        const resultadoProductos = await conexion.query(
            `SELECT id, nombre, precio, stock
             FROM productos
             WHERE id = ANY($1::integer[])
             ORDER BY id
             FOR UPDATE`,
            [idsProductos]
        );

        const productosBD = new Map();

        resultadoProductos.rows.forEach((producto) => {
            productosBD.set(Number(producto.id), producto);
        });

        let total = 0;
        const detalles = [];

        // Verificamos que existan los productos y que tengan stock suficiente.
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

            const stockDisponible = Number(productoBD.stock);

            if (
                !Number.isSafeInteger(stockDisponible) ||
                stockDisponible < 0
            ) {

                const error = new Error(
                    `El stock del producto ${productoBD.nombre} no es válido.`
                );

                error.status = 500;
                throw error;

            }

            if (cantidad > stockDisponible) {

                const error = new Error(
                    `Stock insuficiente para ${productoBD.nombre}. ` +
                    `Disponibles: ${stockDisponible}. Solicitadas: ${cantidad}.`
                );

                error.status = 409;
                throw error;

            }

            // Utilizamos el precio real guardado en PostgreSQL.
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

        // Registramos cada producto y descontamos su stock.
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

            const resultadoStock = await conexion.query(
                `UPDATE productos
                 SET stock = stock - $1
                 WHERE id = $2
                 AND stock >= $1`,
                [
                    detalle.cantidad,
                    detalle.producto_id
                ]
            );

            if (resultadoStock.rowCount !== 1) {

                const error = new Error(
                    "No se pudo actualizar el stock del producto."
                );

                error.status = 409;
                throw error;

            }

        }

        // Confirmamos el pedido y todos los descuentos de stock.
        await conexion.query("COMMIT");

        return res.status(201).json({
            mensaje: "Pedido registrado correctamente y stock actualizado.",
            pedido,
            detalles
        });

    } catch (error) {

        // Si algo falla, revertimos el pedido, sus detalles y los descuentos.
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
            error: estadoHTTP === 400 || estadoHTTP === 409
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
// REGISTRAR UNA CONSULTA Y ENVIAR NOTIFICACIÓN
// ============================================

app.post("/contacto", async (req, res) => {

    const { nombre, email, asunto, mensaje } = req.body || {};

    // Validamos que todos los campos sean textos.
    if (
        typeof nombre !== "string" ||
        typeof email !== "string" ||
        typeof asunto !== "string" ||
        typeof mensaje !== "string"
    ) {
        return res.status(400).json({
            error: "Todos los campos son obligatorios."
        });
    }

    // Eliminamos espacios innecesarios.
    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim().toLowerCase();
    const asuntoLimpio = asunto.trim();
    const mensajeLimpio = mensaje.trim();

    // Validamos que ningún campo esté vacío.
    if (
        !nombreLimpio ||
        !emailLimpio ||
        !asuntoLimpio ||
        !mensajeLimpio
    ) {
        return res.status(400).json({
            error: "Completá todos los campos del formulario."
        });
    }

    // Validamos el formato básico del correo electrónico.
    const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoEmail.test(emailLimpio)) {
        return res.status(400).json({
            error: "Ingresá un correo electrónico válido."
        });
    }

    // Validamos la longitud de los campos.
    if (
        nombreLimpio.length > 100 ||
        emailLimpio.length > 150 ||
        asuntoLimpio.length > 150 ||
        mensajeLimpio.length > 5000
    ) {
        return res.status(400).json({
            error: "Uno o más campos superan la longitud permitida."
        });
    }

    // Verificamos la configuración del servicio de correo.
    if (!process.env.RESEND_API_KEY || !process.env.CONTACT_EMAIL) {

        console.error("Faltan configurar las variables de Resend.");

        return res.status(500).json({
            error: "El servicio de contacto no está disponible."
        });

    }

    try {

        // ========================================
        // 1. GUARDAR LA CONSULTA EN NEON
        // ========================================

        const resultado = await pool.query(
            `INSERT INTO consultas
                (nombre, email, asunto, mensaje)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nombre, email, asunto, fecha_creacion`,
            [
                nombreLimpio,
                emailLimpio,
                asuntoLimpio,
                mensajeLimpio
            ]
        );

        const consulta = resultado.rows[0];

        // ========================================
        // 2. ENVIAR EL CORREO DE NOTIFICACIÓN
        // ========================================

        const resultadoCorreo = await resend.emails.send({

            // Remitente de prueba de Resend.
            from: "Artesana <onboarding@resend.dev>",

            // Dirección que recibirá las consultas.
            to: [process.env.CONTACT_EMAIL],

            // Permite responder directamente al cliente.
            replyTo: emailLimpio,

            // Asunto del correo.
            subject: `Nueva consulta de Artesana: ${asuntoLimpio}`,

            // Contenido del correo.
            text:
                `NUEVA CONSULTA DE ARTESANA\n\n` +
                `Número de consulta: ${consulta.id}\n` +
                `Fecha: ${consulta.fecha_creacion}\n\n` +
                `Nombre: ${nombreLimpio}\n` +
                `Correo electrónico: ${emailLimpio}\n` +
                `Motivo: ${asuntoLimpio}\n\n` +
                `Mensaje:\n${mensajeLimpio}\n\n` +
                `Esta consulta también quedó guardada en la base de datos de Artesana.`

        });

        // Verificamos si Resend informó un error.
        if (resultadoCorreo.error) {

            console.error(
                "La consulta se guardó, pero no se pudo enviar el correo:",
                resultadoCorreo.error
            );

            return res.status(201).json({
                mensaje: "Tu consulta fue registrada correctamente, pero no se pudo enviar la notificación por correo.",
                consulta,
                correoEnviado: false
            });

        }

        // ========================================
        // 3. RESPUESTA EXITOSA
        // ========================================

        console.log(
            "Consulta registrada y correo enviado correctamente:",
            consulta.id
        );

        return res.status(201).json({
            mensaje: "Tu consulta fue enviada correctamente.",
            consulta,
            correoEnviado: true
        });

    } catch (error) {

        console.error(
            "Error al procesar la consulta de contacto:",
            error.message
        );

        return res.status(500).json({
            error: "No se pudo procesar la consulta. Intentá nuevamente."
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
