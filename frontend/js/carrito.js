
/* =====================================================
   PROYECTO ARTESANA
   Archivo: carrito.js
   Carrito, cantidades, imágenes y pedidos por WhatsApp
===================================================== */


// -----------------------------------------------------
// 1. RECUPERAR EL CARRITO GUARDADO
// -----------------------------------------------------

let carrito = [];

try {
    const carritoGuardado = localStorage.getItem("carrito");

    if (carritoGuardado) {
        const productosGuardados = JSON.parse(carritoGuardado);

        if (Array.isArray(productosGuardados)) {
            carrito = productosGuardados.filter(function (producto) {
                return (
                    producto &&
                    producto.id !== undefined &&
                    producto.nombre &&
                    Number.isFinite(Number(producto.precio)) &&
                    Number.isSafeInteger(Number(producto.cantidad)) &&
                    Number(producto.cantidad) > 0
                );
            });
        }
    }
} catch (error) {
    console.error("Error al recuperar el carrito:", error);
    carrito = [];
}


// -----------------------------------------------------
// 2. GUARDAR EL CARRITO
// -----------------------------------------------------

function guardarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
}


// -----------------------------------------------------
// 3. ACTUALIZAR EL CONTADOR
// -----------------------------------------------------

function actualizarContadorCarrito() {
    const contador = document.getElementById("contador-carrito");

    if (!contador) {
        return;
    }

    const cantidadTotal = carrito.reduce(function (total, producto) {
        return total + Number(producto.cantidad);
    }, 0);

    contador.textContent = cantidadTotal;
}


// -----------------------------------------------------
// 4. MOSTRAR LOS PRODUCTOS DEL CARRITO
// -----------------------------------------------------

function mostrarCarrito() {
    const contenedor = document.getElementById("carrito-container");

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    if (carrito.length === 0) {
        contenedor.innerHTML = `
            <div class="text-center py-5">
                <h3>🛒 Tu carrito está vacío</h3>

                <p class="lead mt-3">
                    Agregá productos desde nuestro catálogo.
                </p>

                <a href="index.html" class="btn btn-primary mt-3">
                    Ver catálogo
                </a>
            </div>
        `;

        actualizarBotonWhatsapp();
        return;
    }

    carrito.forEach(function (producto) {
        const precio = Number(producto.precio);
        const cantidad = Number(producto.cantidad);
        const subtotal = precio * cantidad;

        // Tarjeta del producto.
        const tarjeta = document.createElement("div");
        tarjeta.className = "card mb-3";

        const fila = document.createElement("div");
        fila.className = "row g-0 align-items-center";

        // Imagen.
        const columnaImagen = document.createElement("div");
        columnaImagen.className = "col-4 col-md-3";

        const imagen = document.createElement("img");
        imagen.className = "img-fluid rounded-start";
        imagen.src = producto.imagen || "";
        imagen.alt = producto.nombre;
        imagen.style.maxHeight = "180px";
        imagen.style.objectFit = "contain";

        columnaImagen.appendChild(imagen);

        // Información.
        const columnaDatos = document.createElement("div");
        columnaDatos.className = "col-8 col-md-9";

        const cuerpo = document.createElement("div");
        cuerpo.className = "card-body";

        const nombre = document.createElement("h5");
        nombre.className = "card-title";
        nombre.textContent = producto.nombre;

        const precioTexto = document.createElement("p");
        precioTexto.className = "card-text";
        precioTexto.textContent = "Precio unitario: $" + precio;

        const cantidadTexto = document.createElement("p");
        cantidadTexto.className = "card-text";
        cantidadTexto.textContent = "Cantidad: " + cantidad;

        const subtotalTexto = document.createElement("p");
        subtotalTexto.className = "card-text fw-bold";
        subtotalTexto.textContent = "Subtotal: $" + subtotal;

        // Botón para disminuir.
        const botonDisminuir = document.createElement("button");
        botonDisminuir.type = "button";
        botonDisminuir.className =
            "btn btn-outline-secondary btn-sm me-2";
        botonDisminuir.textContent = "−";
        botonDisminuir.dataset.producto = String(producto.id);

        // IMPORTANTE: identifica la acción del botón.
        botonDisminuir.dataset.accionCarrito = "disminuir";

        botonDisminuir.setAttribute(
            "aria-label",
            "Disminuir cantidad"
        );

        // Botón para aumentar.
        const botonAumentar = document.createElement("button");
        botonAumentar.type = "button";
        botonAumentar.className =
            "btn btn-outline-secondary btn-sm me-2";
        botonAumentar.textContent = "+";
        botonAumentar.dataset.producto = String(producto.id);

        // IMPORTANTE: identifica la acción del botón.
        botonAumentar.dataset.accionCarrito = "aumentar";

        botonAumentar.setAttribute(
            "aria-label",
            "Aumentar cantidad"
        );

        // Botón para eliminar.
        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.className =
            "btn btn-outline-danger btn-sm btn-eliminar";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.dataset.producto = String(producto.id);

        cuerpo.appendChild(nombre);
        cuerpo.appendChild(precioTexto);
        cuerpo.appendChild(cantidadTexto);
        cuerpo.appendChild(subtotalTexto);
        cuerpo.appendChild(botonDisminuir);
        cuerpo.appendChild(botonAumentar);
        cuerpo.appendChild(botonEliminar);

        columnaDatos.appendChild(cuerpo);

        fila.appendChild(columnaImagen);
        fila.appendChild(columnaDatos);
        tarjeta.appendChild(fila);

        contenedor.appendChild(tarjeta);
    });

    // Total aproximado mostrado en pantalla.
    const total = carrito.reduce(function (acumulado, producto) {
        return acumulado +
            Number(producto.precio) * Number(producto.cantidad);
    }, 0);

    const resumen = document.createElement("div");
    resumen.className = "text-end mt-4";

    const totalTexto = document.createElement("h4");
    totalTexto.textContent = "Total aproximado: $" + total;

    resumen.appendChild(totalTexto);
    contenedor.appendChild(resumen);

    actualizarBotonWhatsapp();
}


// -----------------------------------------------------
// 5. AGREGAR PRODUCTOS DESDE EL CATÁLOGO
// -----------------------------------------------------
document.addEventListener("click", function (event) {
    const boton = event.target.closest("[data-producto][data-precio]");

    if (!boton) {
        return;
    }

    // Verificamos si el usuario inició sesión
    const token = localStorage.getItem("token");
    const usuarioGuardado = localStorage.getItem("usuarioLogueado");

    // Si no hay sesión, impedimos agregar el producto
    if (!token || !usuarioGuardado) {
        alert("Para agregar productos al carrito, primero tenés que iniciar sesión.");
        window.location.href = "login.html";
        return;
    }

    // No tratar botones de cantidad o eliminación
    // como botones para agregar productos.
    if (
        boton.classList.contains("btn-eliminar") ||
        boton.dataset.accionCarrito
    ) {
        return;
    }

    const id = Number(boton.dataset.id);
    const nombre = boton.dataset.producto;
    const precio = Number(boton.dataset.precio);
    const imagen = boton.dataset.imagen || "";

    if (
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        !nombre ||
        !Number.isFinite(precio) ||
        precio < 0
    ) {
        alert("No se pudo agregar el producto. Verificá sus datos.");
        console.error("Datos inválidos:", boton.dataset);
        return;
    }

    const productoExistente = carrito.find(function (producto) {
        return Number(producto.id) === id;
    });

    if (productoExistente) {
        productoExistente.cantidad++;
    } else {
        carrito.push({
            id: id,
            nombre: nombre,
            precio: precio,
            imagen: imagen,
            cantidad: 1
        });
    }

    guardarCarrito();
    actualizarContadorCarrito();
    mostrarCarrito();

    console.log("Carrito actualizado:", carrito);
});


// -----------------------------------------------------
// 6. AUMENTAR, DISMINUIR Y ELIMINAR PRODUCTOS
// -----------------------------------------------------

document.addEventListener("click", function (event) {
    const boton = event.target.closest(
        ".btn-eliminar, [data-accion-carrito]"
    );

    if (!boton) {
        return;
    }

    const id = Number(boton.dataset.producto);

    if (!Number.isSafeInteger(id)) {
        return;
    }

    const indice = carrito.findIndex(function (producto) {
        return Number(producto.id) === id;
    });

    if (indice === -1) {
        return;
    }

    // Eliminar el producto completo.
    if (boton.classList.contains("btn-eliminar")) {
        carrito.splice(indice, 1);
    }

    // Aumentar una unidad.
    else if (boton.dataset.accionCarrito === "aumentar") {
        carrito[indice].cantidad++;
    }

    // Disminuir una unidad.
    else if (boton.dataset.accionCarrito === "disminuir") {
        if (carrito[indice].cantidad > 1) {
            carrito[indice].cantidad--;
        } else {
            // Si queda en cero, quitamos el producto.
            carrito.splice(indice, 1);
        }
    } else {
        return;
    }

    guardarCarrito();
    actualizarContadorCarrito();
    mostrarCarrito();
});


// -----------------------------------------------------
// 7. MOSTRAR U OCULTAR EL BOTÓN DE WHATSAPP
// -----------------------------------------------------

function actualizarBotonWhatsapp() {
    const botonWhatsapp = document.getElementById("btn-whatsapp");

    if (!botonWhatsapp) {
        return;
    }

    botonWhatsapp.style.display =
        carrito.length > 0 ? "inline-block" : "none";
}


// -----------------------------------------------------
// 8. REGISTRAR EL PEDIDO Y ABRIR WHATSAPP
// -----------------------------------------------------

const botonWhatsapp = document.getElementById("btn-whatsapp");

if (botonWhatsapp) {
    botonWhatsapp.addEventListener("click", async function () {

        if (carrito.length === 0) {
            alert("Tu carrito está vacío.");
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            alert(
                "Tu sesión no está iniciada. Iniciá sesión nuevamente."
            );

            window.location.href = "login.html";
            return;
        }

        // Evitamos varios envíos por clics repetidos.
        if (botonWhatsapp.disabled) {
            return;
        }

        botonWhatsapp.disabled = true;

        // Abrimos la pestaña durante el clic del usuario.
        const ventanaWhatsapp = window.open("about:blank", "_blank");

        if (!ventanaWhatsapp) {
            botonWhatsapp.disabled = false;

            alert(
                "El navegador bloqueó la nueva pestaña. " +
                "Permití las ventanas emergentes y volvé a intentarlo."
            );

            return;
        }

        try {
            // Enviamos al backend los ID y las cantidades.
            const respuesta = await fetch(
                "http://localhost:3000/pedidos",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },

                    body: JSON.stringify({
                        productos: carrito.map(function (producto) {
                            return {
                                id: Number(producto.id),
                                cantidad: Number(producto.cantidad)
                            };
                        })
                    })
                }
            );

            const datos = await respuesta.json();

           
            // Si el backend rechaza el pedido, no abrimos WhatsApp.
            if (!respuesta.ok) {
                ventanaWhatsapp.close();

                // Si el token venció o no es válido,
                // cerramos la sesión local y pedimos volver a ingresar.
                if (respuesta.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuarioLogueado");
                    localStorage.removeItem("carrito");

                    carrito = [];
                    actualizarContadorCarrito();
                    mostrarCarrito();

                    alert(
                        "Tu sesión venció o dejó de ser válida. " +
                        "Iniciá sesión nuevamente."
                    );

                    window.location.href = "login.html";
                    return;
                }

                alert(
                    datos.error || "No se pudo registrar el pedido."
                );

                return;
            }


            // Armamos el mensaje.
            let mensaje =
                "Hola! Quiero consultar por el siguiente pedido:\n\n";

            mensaje += "Número de pedido: " + datos.pedido.id + "\n\n";

            carrito.forEach(function (producto) {
                const subtotal =
                    Number(producto.precio) * Number(producto.cantidad);

                mensaje += "Producto: " + producto.nombre + "\n";
                mensaje += "Cantidad: " + producto.cantidad + "\n";
                mensaje += "Subtotal aproximado: $" + subtotal + "\n\n";
            });

            // El total registrado proviene del backend.
            const totalBackend = Number(datos.pedido.total);

            if (Number.isFinite(totalBackend)) {
                mensaje += "Total registrado: $" + totalBackend + "\n";
            }

            mensaje += "\nPedido registrado como pendiente.";

            const numeroWhatsapp = "5491165076525";

            const urlWhatsapp =
                "https://wa.me/" +
                numeroWhatsapp +
                "?text=" +
                encodeURIComponent(mensaje);

            // Abrimos el pedido registrado en WhatsApp.
            ventanaWhatsapp.location.href = urlWhatsapp;

        } catch (error) {
            console.error("Error al registrar el pedido:", error);

            if (ventanaWhatsapp && !ventanaWhatsapp.closed) {
                ventanaWhatsapp.close();
            }

            alert(
                "No se pudo registrar el pedido. " +
                "Verificá que el backend esté funcionando."
            );

        } finally {
            botonWhatsapp.disabled = false;
        }
    });
}


// -----------------------------------------------------
// 9. AMPLIAR LAS IMÁGENES DE LOS PRODUCTOS
// -----------------------------------------------------

const imagenModal = document.getElementById("imagenAmpliada");
const modalImagen = document.getElementById("modalImagen");

document.addEventListener("click", function (event) {
    const imagen = event.target.closest(".card-img-top");

    if (!imagen || !imagenModal || !modalImagen) {
        return;
    }

    imagenModal.src = imagen.src;
    imagenModal.alt = imagen.alt;

    if (window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal
            .getOrCreateInstance(modalImagen)
            .show();
    }
});


// -----------------------------------------------------
// 10. ACTUALIZAR LA PÁGINA AL CARGAR
// -----------------------------------------------------

mostrarCarrito();
actualizarContadorCarrito();
actualizarBotonWhatsapp();
