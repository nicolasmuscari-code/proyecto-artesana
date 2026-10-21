// Buscamos el enlace de Login dentro del navbar
const enlaceLogin = document.getElementById("nav-login");


// Comprobamos si existe el enlace
if (enlaceLogin) {

    // Recuperamos el usuario guardado en LocalStorage
    const usuarioGuardado = localStorage.getItem("usuarioLogueado");


    // Si existe un usuario, mostramos que la sesión está iniciada
    if (usuarioGuardado) {

        // Convertimos los datos guardados nuevamente en objeto
        const usuario = JSON.parse(usuarioGuardado);


        // Obtenemos el email del usuario
        const email = usuario.email;


        // Obtenemos solamente la parte anterior al @
        let nombreUsuario = email.split("@")[0];


        // Convertimos la primera letra del nombre a mayúscula
        nombreUsuario =
            nombreUsuario.charAt(0).toUpperCase() +
            nombreUsuario.slice(1);


        // Cambiamos el contenido del enlace de Login
        enlaceLogin.innerHTML = `
            👋 Hola, ${nombreUsuario}
        `;


        // Evitamos que el enlace lleve nuevamente al Login
        enlaceLogin.href = "#";


        // Creamos el enlace para cerrar sesión
        const enlaceCerrarSesion = document.createElement("a");


        // Le asignamos las clases utilizadas por Bootstrap
        enlaceCerrarSesion.className = "nav-link";

        // Mostramos el cursor de enlace al pasar sobre "Cerrar sesión"
enlaceCerrarSesion.style.cursor = "pointer";


        // Le asignamos un identificador para poder reconocerlo
        enlaceCerrarSesion.id = "nav-logout";


        // Definimos el texto que verá el usuario
        enlaceCerrarSesion.innerHTML = `
            🚪 Cerrar sesión
        `;


        // Insertamos el enlace de cerrar sesión después de "Hola, usuario"
        enlaceLogin.parentNode.appendChild(enlaceCerrarSesion);


        // Detectamos cuando el usuario selecciona Cerrar sesión
        enlaceCerrarSesion.addEventListener("click", function(event) {

            // Evitamos que el enlace recargue la página
            event.preventDefault();


          // Eliminamos los datos de la sesión
localStorage.removeItem("usuarioLogueado");
localStorage.removeItem("token");

// Limpiamos el carrito del usuario que cerró sesión
localStorage.removeItem("carrito");

// Volvemos a la página de inicio
window.location.href = "index.html";

        });

    }

}