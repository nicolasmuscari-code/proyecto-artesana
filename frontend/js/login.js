
// Buscamos el formulario de inicio de sesión
const formularioLogin = document.getElementById("form-login");

// Comprobamos que el formulario exista en la página
if (formularioLogin) {

    // Detectamos cuando el usuario intenta iniciar sesión
    formularioLogin.addEventListener("submit", async function(event) {

        // Evitamos que el formulario recargue la página
        event.preventDefault();

        // Obtenemos los datos ingresados por el usuario
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        // Comprobamos que los campos estén completos
        if (email === "" || password === "") {
            alert("Por favor, completá todos los campos.");
            return;
        }

        try {

            // Enviamos las credenciales al Backend
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

            // Convertimos la respuesta a JSON
            const datos = await respuesta.json();

            // Si las credenciales no son válidas o hay un error
            if (!respuesta.ok) {
                alert(datos.error || "No se pudo iniciar sesión.");
                return;
            }

            // Guardamos el token JWT
            localStorage.setItem("token", datos.token);

            // Guardamos los datos básicos del usuario
            localStorage.setItem(
                "usuarioLogueado",
                JSON.stringify(datos.usuario)
            );

            // Informamos que el inicio de sesión fue correcto
            alert("Inicio de sesión exitoso.");

            // Redirigimos al inicio
            window.location.href = "index.html";

        } catch (error) {

            // Mostramos el error en la consola
            console.error("Error al iniciar sesión:", error);

            alert(
                "No se pudo conectar con el servidor. " +
                "Verificá que el Backend esté funcionando."
            );
        }
    });
}
