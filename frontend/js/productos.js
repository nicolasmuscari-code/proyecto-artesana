
/*
    PROYECTO ARTESANA
    Carga los productos desde el Backend
    según la categoría de la página.
*/

// Dirección de la API que devuelve los productos de PostgreSQL
const API_PRODUCTOS = `${API_BASE_URL}/productos`;

// Buscamos el contenedor donde se mostrarán los productos
const contenedorProductos = document.getElementById("contenedor-productos");

// Identificamos la categoría que corresponde a esta página
const categoriaPagina = document.body.dataset.categoria;

// Consultamos la API para obtener los productos
fetch(API_PRODUCTOS)
    .then(function (respuesta) {

        // Comprobamos si la respuesta fue correcta
        if (!respuesta.ok) {
            throw new Error("No se pudieron obtener los productos.");
        }

        // Convertimos la respuesta a formato JSON
        return respuesta.json();
    })
    .then(function (productos) {

        // Mostramos en consola los productos recibidos
        console.log("Productos recibidos desde el Backend:", productos);

        // Verificamos que existan el contenedor y la categoría
        if (!contenedorProductos || !categoriaPagina) {
            console.error("No se encontró el contenedor o la categoría de la página.");
            return;
        }

        // Filtramos los productos de la categoría correspondiente
        const productosCategoria = productos.filter(function (producto) {
            return producto.categoria === categoriaPagina;
        });

        // Si no hay productos, mostramos un mensaje
        if (productosCategoria.length === 0) {
            contenedorProductos.innerHTML = `
                <div class="col-12 text-center">
                    <p>No hay productos disponibles por el momento.</p>
                </div>
            `;
            return;
        }

        // Recorremos los productos recibidos desde la API
        productosCategoria.forEach(function (producto) {

            // Creamos una tarjeta para cada producto
            contenedorProductos.innerHTML += `
                <div class="col-12 col-md-6 col-lg-4">

                    <div class="card">

                        <img
                            src="${producto.imagen}"
                            class="card-img-top"
                            alt="${producto.nombre}">

                        <small class="text-muted text-center d-block mt-2">
                            🔍 Hacé clic en la imagen para verla ampliada
                        </small>

                        <div class="card-body d-flex flex-column">

                            <h5 class="card-title">
                                ${producto.nombre}
                            </h5>

                            <p class="card-text">
                                ${producto.descripcion || ""}
                            </p>

                            <p class="card-text">
                                $${Number(producto.precio).toLocaleString("es-AR")}
                            </p>

<button
    class="btn btn-primary mt-auto"
    data-id="${producto.id}"
    data-producto="${producto.nombre}"
    data-precio="${producto.precio}"
    data-imagen="${producto.imagen}">

    🛒 Agregar al carrito

</button>


                        </div>

                    </div>

                </div>
            `;
        });
    })
    .catch(function (error) {

        // Informamos si hubo un problema al consultar la API
        console.error("Error al cargar los productos:", error);

        if (contenedorProductos) {
            contenedorProductos.innerHTML = `
                <div class="col-12 text-center">
                    <p>No se pudieron cargar los productos.</p>
                    <p>Verificá que el Backend esté funcionando.</p>
                </div>
            `;
        }
    });
