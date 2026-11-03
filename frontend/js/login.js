// ============================================
// INICIO DE SESIÓN DE ARTESANA
// ============================================


// ============================================
// INICIO DE SESIÓN TRADICIONAL
// ============================================

// Buscamos el formulario de inicio de sesión.
const formularioLogin = document.getElementById("form-login");

// Comprobamos que el formulario exista en la página.
if (formularioLogin) {

    // Detectamos cuando el usuario intenta iniciar sesión.
    formularioLogin.addEventListener("submit", async function(event) {

        // Evitamos que el formulario recargue la página.
        event.preventDefault();

        // Obtenemos los datos ingresados por el usuario.
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        // Comprobamos que los campos estén completos.
        if (email === "" || password === "") {
            alert("Por favor, completá todos los campos.");
            return;
        }

        try {

            // Enviamos las credenciales al Backend.
            const respuesta = await fetch(`${API_BASE_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            // Convertimos la respuesta a JSON.
            const datos = await respuesta.json();

            // Si las credenciales no son válidas o hay un error.
            if (!respuesta.ok) {
                alert(datos.error || "No se pudo iniciar sesión.");
                return;
            }

            // Guardamos el token JWT.
            localStorage.setItem("token", datos.token);

            // Guardamos los datos básicos del usuario.
            localStorage.setItem(
                "usuarioLogueado",
                JSON.stringify(datos.usuario)
            );

            // Redirigimos al inicio.
            window.location.href = "index.html";

        } catch (error) {

            // Mostramos el error en la consola.
            console.error("Error al iniciar sesión:", error);

            alert(
                "No se pudo conectar con el servidor. " +
                "Verificá que el Backend esté funcionando."
            );
        }
    });
}


// ============================================
// INICIO DE SESIÓN CON GOOGLE
// ============================================

// Identificador público de nuestra aplicación Artesana.
const GOOGLE_CLIENT_ID =
    "589244284291-ga1nbad6vrabi0q5nq60b7omi4e8daii.apps.googleusercontent.com";

// Buscamos el espacio donde se mostrará el botón de Google.
const contenedorGoogle = document.getElementById("google-button");

// Comprobamos que el contenedor y la biblioteca de Google existan.
if (contenedorGoogle && window.google && window.google.accounts) {

    // Configuramos el inicio de sesión con Google.
    google.accounts.id.initialize({

        // Identifica nuestra aplicación ante Google.
        client_id: GOOGLE_CLIENT_ID,

        // Función que recibe la credencial de Google.
        callback: manejarRespuestaGoogle

    });

    // Mostramos el botón oficial de Google.
    google.accounts.id.renderButton(

        contenedorGoogle,

        {
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: 280,
            locale: "es"
        }
    );

} else {

    console.error(
        "No se pudo cargar la biblioteca de Google Identity Services."
    );
}


// ============================================
// PROCESAR LA RESPUESTA DE GOOGLE
// ============================================

async function manejarRespuestaGoogle(respuestaGoogle) {

    try {

        // Comprobamos que Google haya enviado una credencial.
        if (!respuestaGoogle.credential) {
            alert("No se recibió la credencial de Google.");
            return;
        }

        // Enviamos la credencial al Backend para verificarla.
        const respuesta = await fetch(`${API_BASE_URL}/auth/google`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                credential: respuestaGoogle.credential
            })

        });

        // Convertimos la respuesta del Backend a JSON.
        const datos = await respuesta.json();

        // Si el Backend informa un error.
        if (!respuesta.ok) {

            alert(
                datos.error ||
                "No se pudo iniciar sesión con Google."
            );

            return;
        }

        // Guardamos el JWT generado por el Backend.
        localStorage.setItem("token", datos.token);

        // Guardamos los datos del usuario.
        localStorage.setItem(
            "usuarioLogueado",
            JSON.stringify(datos.usuario)
        );

        // Redirigimos al inicio de Artesana.
        window.location.href = "index.html";

    } catch (error) {

        // Mostramos el error en la consola.
        console.error(
            "Error al iniciar sesión con Google:",
            error
        );

        alert(
            "No se pudo conectar con el servidor. " +
            "Intentá nuevamente."
        );
    }
}